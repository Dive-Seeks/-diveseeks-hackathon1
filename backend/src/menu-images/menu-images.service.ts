import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  GeneratedImage,
  ApprovalStatus,
  SourceMode,
} from './entities/generated-image.entity';
import { GenerateImageDto } from './dto/generate-image.dto';
import { SearchImagesDto } from './dto/search-images.dto';
import { FtpService } from '../ftp/ftp.service';
import { EmbeddingService } from '../menu-embeddings/embedding.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MenuImagesService {
  private readonly logger = new Logger(MenuImagesService.name);
  private readonly uploadsPath = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(GeneratedImage)
    private readonly repo: Repository<GeneratedImage>,
    @InjectQueue('menu-image-generation')
    private readonly generationQueue: Queue,
    private readonly ftpService: FtpService,
    private readonly embeddingService: EmbeddingService,
  ) {
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async generate(
    dto: GenerateImageDto,
    tenantId: string,
    sourceImage?: Express.Multer.File,
    styleRefImage?: Express.Multer.File,
  ): Promise<{ jobId: string; imageId: string }> {
    // Validate OpenAI key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new BadRequestException(
        'OpenAI API key not configured. Please set OPENAI_API_KEY in environment.',
      );
    }

    // Determine source mode
    let sourceMode = dto.sourceMode || SourceMode.TEXT;
    if (sourceImage && styleRefImage) sourceMode = SourceMode.TWO_PHOTOS;
    else if (sourceImage) sourceMode = SourceMode.SINGLE_PHOTO;

    // Upload source images to FTP if provided
    let sourceImageUrl: string | null = null;
    let styleRefImageUrl: string | null = null;

    if (sourceImage) {
      const result = await this.uploadSourceImage(
        sourceImage,
        tenantId,
        dto.storeId,
      );
      sourceImageUrl = result;
    }
    if (styleRefImage) {
      const result = await this.uploadSourceImage(
        styleRefImage,
        tenantId,
        dto.storeId,
      );
      styleRefImageUrl = result;
    }

    // Create pending record
    const recordData = {
      tenantId,
      storeId: dto.storeId || null,
      itemName: dto.itemName,
      cuisineType: dto.cuisineType || null,
      businessType: dto.businessType || null,
      sourceMode,
      sourceImageUrl,
      styleRefImageUrl,
      approvalStatus: ApprovalStatus.PENDING,
      generationModel: 'dall-e-3',
    };

    const saved = await this.repo.save(this.repo.create(recordData));

    // Queue the generation job
    const job = await this.generationQueue.add(
      'generate',
      {
        imageId: saved.id,
        itemName: dto.itemName,
        cuisineType: dto.cuisineType,
        businessType: dto.businessType,
        preset: dto.preset || 'premium',
        sourceMode,
        tenantId,
        storeId: dto.storeId,
        sourceImageUrl,
        styleRefImageUrl,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Queued generation job ${job.id} for image ${saved.id}`);

    return { jobId: job.id as string, imageId: saved.id };
  }

  async search(
    query: SearchImagesDto,
    tenantId: string,
  ): Promise<GeneratedImage[]> {
    const limit = query.limit || 6;

    if (!query.q) {
      // Return recent approved images
      return this.repo.find({
        where: [
          { tenantId, approvalStatus: ApprovalStatus.APPROVED },
          { isGlobal: true, approvalStatus: ApprovalStatus.APPROVED },
        ],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    }

    // Compute embedding for query
    const embedding = await this.embeddingService.embed(query.q);

    // Search tenant images
    const tenantResults = await this.searchByEmbedding(
      embedding,
      tenantId,
      Math.ceil(limit / 2),
    );
    // Search global pool
    const globalResults = await this.searchByEmbedding(
      embedding,
      null,
      Math.ceil(limit / 2),
    );

    // Combine and deduplicate
    const seen = new Set<string>();
    const combined: GeneratedImage[] = [];
    for (const img of [...tenantResults, ...globalResults]) {
      if (!seen.has(img.id)) {
        seen.add(img.id);
        combined.push(img);
      }
    }

    return combined.slice(0, limit);
  }

  private async searchByEmbedding(
    queryEmbedding: number[],
    tenantId: string | null,
    limit: number,
  ): Promise<GeneratedImage[]> {
    // Fetch candidates for JS-based cosine similarity
    const qb = this.repo.createQueryBuilder('img');

    if (tenantId) {
      qb.where('img.tenant_id = :tenantId', { tenantId });
    } else {
      qb.where('img.is_global = true');
    }
    qb.andWhere('img.approval_status = :status', {
      status: ApprovalStatus.APPROVED,
    });
    qb.andWhere('img.prompt_embedding IS NOT NULL');
    qb.limit(200);

    const rows = await qb.getMany();

    const scored = rows
      .map((row) => ({
        image: row,
        similarity: row.promptEmbedding
          ? cosineSimilarity(queryEmbedding, row.promptEmbedding)
          : 0,
      }))
      .filter((r) => r.similarity >= 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return scored.map((s) => s.image);
  }

  async getStatus(imageId: string, tenantId: string): Promise<GeneratedImage> {
    const image = await this.repo.findOne({
      where: { id: imageId, tenantId },
    });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  async approve(
    imageId: string,
    tenantId: string,
    userId: string,
  ): Promise<GeneratedImage> {
    const image = await this.getStatus(imageId, tenantId);
    image.approvalStatus = ApprovalStatus.APPROVED;
    image.approvedAt = new Date();
    image.approvedByUserId = userId;
    return this.repo.save(image);
  }

  async reject(imageId: string, tenantId: string): Promise<GeneratedImage> {
    const image = await this.getStatus(imageId, tenantId);
    image.approvalStatus = ApprovalStatus.REJECTED;
    return this.repo.save(image);
  }

  async listApproved(tenantId: string): Promise<GeneratedImage[]> {
    return this.repo.find({
      where: { tenantId, approvalStatus: ApprovalStatus.APPROVED },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async listAll(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<GeneratedImage[]> {
    const skip = (page - 1) * limit;
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip,
      take: Math.min(limit, 100),
    });
  }

  private async uploadSourceImage(
    file: Express.Multer.File,
    tenantId: string,
    storeId?: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `source-${timestamp}${ext}`;
    const tempPath = path.join(this.uploadsPath, fileName);

    fs.writeFileSync(tempPath, file.buffer);

    try {
      const result = await this.ftpService.uploadTenantFile(
        tempPath,
        fileName,
        tenantId,
        storeId || null,
        'gallery',
      );
      return result.url;
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
