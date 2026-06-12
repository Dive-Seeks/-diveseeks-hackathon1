import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import {
  GeneratedImage,
  ApprovalStatus,
  SourceMode,
} from './entities/generated-image.entity';
import { StoreImage } from '../store-images/entities/store-image.entity';
import { ImageAnalysisService } from './services/image-analysis.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { EmbeddingService } from '../menu-embeddings/embedding.service';
import { FtpService } from '../ftp/ftp.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { MenuEmbeddingsService } from '../menu-embeddings/menu-embeddings.service';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import sharp from 'sharp';

interface GenerationJobData {
  imageId: string;
  itemName: string;
  cuisineType?: string;
  businessType?: string;
  preset: string;
  sourceMode: SourceMode;
  tenantId: string;
  storeId?: string;
  sourceImageUrl?: string;
  styleRefImageUrl?: string;
}

@Processor('menu-image-generation')
export class MenuImageGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(MenuImageGenerationProcessor.name);
  private readonly uploadsPath = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(GeneratedImage)
    private readonly repo: Repository<GeneratedImage>,
    @InjectRepository(StoreImage)
    private readonly storeImageRepo: Repository<StoreImage>,
    private readonly analysisService: ImageAnalysisService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly embeddingService: EmbeddingService,
    private readonly menuEmbeddings: MenuEmbeddingsService,
    private readonly ftpService: FtpService,
    private readonly salesGateway: SalesGateway,
  ) {
    super();
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async process(job: Job<GenerationJobData>): Promise<void> {
    const data = job.data;
    this.logger.log(
      `Processing generation job ${job.id} for image ${data.imageId}`,
    );

    try {
      // 1. Update status to analyzing
      await this.updateStatus(data.imageId, ApprovalStatus.ANALYZING);

      // 2. Run image analysis based on source mode
      const schema = await this.runAnalysis(data);
      await job.updateProgress(30);

      // 3. Build DALL-E prompt
      const dallePrompt = this.promptBuilder.buildDallePrompt(schema);
      await this.repo.update(data.imageId, {
        promptJson: schema,
        dallePrompt,
        approvalStatus: ApprovalStatus.GENERATING,
      });
      await job.updateProgress(40);

      // 4. Call DALL-E 3
      this.logger.log(`Calling DALL-E 3 for image ${data.imageId}`);
      const imageData = await this.callDalle(dallePrompt);
      await job.updateProgress(70);

      // 5. Process with Sharp (resize + thumbnail)
      const { mainBuffer, thumbBuffer } = await this.processImage(imageData);
      await job.updateProgress(80);

      // 6. Upload to FTP
      const { imageUrl, thumbnailUrl, ftpPath } = await this.uploadToFtp(
        mainBuffer,
        thumbBuffer,
        data.tenantId,
        data.storeId,
        data.imageId,
      );
      await job.updateProgress(90);

      // 7. Compute embedding
      const embeddingText = this.promptBuilder.serializeSchema(schema);
      const embedding = await this.embeddingService.embed(embeddingText);

      // Also save to MenuEmbeddings table for cross-referencing
      await this.menuEmbeddings.upsertEmbedding({
        tenantId: data.tenantId,
        sourceType: 'generated_image',
        sourceId: data.imageId,
        content: embeddingText,
        metadata: {
          itemName: data.itemName,
          cuisineType: data.cuisineType,
          businessType: data.businessType,
          sourceMode: data.sourceMode,
        },
        embedding,
      });

      // 8. Update record
      await this.repo.update(data.imageId, {
        imageUrl,
        thumbnailUrl,
        promptJson: schema,
        promptEmbedding: embedding,
        dallePrompt,
        approvalStatus: ApprovalStatus.COMPLETED,
        generationCost: 0.04,
        generationModel: 'dall-e-3',
      });

      // 8.5 Save to StoreImage gallery
      const storeImage = this.storeImageRepo.create({
        tenantId: data.tenantId,
        storeId: data.storeId || null,
        siteId: data.storeId || null,
        fileName: path.basename(imageUrl),
        originalName: `ai-gen-${data.imageId}.jpg`,
        ftpPath: ftpPath,
        ftpUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        fileSize: mainBuffer.length,
        mimeType: 'image/jpeg',
        tags: [data.itemName, data.cuisineType || ''].filter(Boolean),
      });
      await this.storeImageRepo.save(storeImage);

      await job.updateProgress(100);

      // 9. Emit WebSocket event
      this.salesGateway.server.emit('menu_image_generated', {
        imageId: data.imageId,
        tenantId: data.tenantId,
        storeId: data.storeId,
        imageUrl,
        thumbnailUrl,
      });

      this.logger.log(`Generation complete for image ${data.imageId}`);
    } catch (err: any) {
      const error = err as Error;
      this.logger.error(`Generation failed for image ${data.imageId}:`, error);

      await this.repo.update(data.imageId, {
        approvalStatus: ApprovalStatus.FAILED,
        errorMessage: error.message || 'Unknown error',
      });

      this.salesGateway.server.emit('menu_image_failed', {
        imageId: data.imageId,
        error: error.message || 'Generation failed',
      });

      throw err;
    }
  }

  private async runAnalysis(data: GenerationJobData) {
    switch (data.sourceMode) {
      case SourceMode.SINGLE_PHOTO: {
        if (!data.sourceImageUrl)
          throw new Error('Source image URL required for single_photo mode');
        const base64 = await this.downloadAsBase64(data.sourceImageUrl);
        return this.analysisService.analyzeSinglePhoto(
          base64,
          data.itemName,
          data.preset,
        );
      }
      case SourceMode.TWO_PHOTOS: {
        if (!data.sourceImageUrl || !data.styleRefImageUrl) {
          throw new Error(
            'Both source and style reference URLs required for two_photos mode',
          );
        }
        const dishBase64 = await this.downloadAsBase64(data.sourceImageUrl);
        const styleBase64 = await this.downloadAsBase64(data.styleRefImageUrl);
        return this.analysisService.analyzeTwoPhotos(
          dishBase64,
          styleBase64,
          data.itemName,
        );
      }
      default:
        return this.analysisService.analyzeText(
          data.itemName,
          data.cuisineType,
          data.preset,
        );
    }
  }

  private async callDalle(prompt: string): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const response = await axios.post<{ data: { b64_json: string }[] }>(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      },
    );

    const b64 = response.data.data[0].b64_json;
    return Buffer.from(b64, 'base64');
  }

  private async processImage(imageBuffer: Buffer): Promise<{
    mainBuffer: Buffer;
    thumbBuffer: Buffer;
  }> {
    const mainBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const thumbBuffer = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    return { mainBuffer, thumbBuffer };
  }

  private async uploadToFtp(
    mainBuffer: Buffer,
    thumbBuffer: Buffer,
    tenantId: string,
    storeId?: string,
    imageId?: string,
  ): Promise<{ imageUrl: string; thumbnailUrl: string; ftpPath: string }> {
    const timestamp = Date.now();
    const mainName = `ai-gen-${imageId || timestamp}.jpg`;
    const thumbName = `ai-gen-${imageId || timestamp}-thumb.jpg`;

    const mainPath = path.join(this.uploadsPath, mainName);
    const thumbPath = path.join(this.uploadsPath, thumbName);

    fs.writeFileSync(mainPath, mainBuffer);
    fs.writeFileSync(thumbPath, thumbBuffer);

    try {
      const results = await this.ftpService.uploadTenantFiles(
        [
          { localPath: mainPath, fileName: mainName },
          { localPath: thumbPath, fileName: thumbName },
        ],
        tenantId,
        storeId || null,
        'gallery',
      );

      return {
        imageUrl: results[0].url,
        thumbnailUrl: results[1].url,
        ftpPath: results[0].path,
      };
    } finally {
      if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }
  }

  private async downloadAsBase64(url: string): Promise<string> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data).toString('base64');
  }

  private async updateStatus(
    imageId: string,
    status: ApprovalStatus,
  ): Promise<void> {
    await this.repo.update(imageId, { approvalStatus: status });
  }
}
