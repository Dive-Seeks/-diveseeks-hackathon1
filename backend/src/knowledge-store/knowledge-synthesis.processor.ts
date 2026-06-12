import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GlobalKnowledge } from './entities/global-knowledge.entity';
import { TenantKnowledge } from './entities/tenant-knowledge.entity';
import { KnowledgeSynthesisService } from './knowledge-synthesis.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { EmbeddingService } from '../menu-embeddings/embedding.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Processor('knowledge-synthesis')
export class KnowledgeSynthesisProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(KnowledgeSynthesisProcessor.name);

  constructor(
    @InjectQueue('knowledge-synthesis') private readonly synthesisQueue: Queue,
    @InjectRepository(GlobalKnowledge)
    private readonly globalRepo: Repository<GlobalKnowledge>,
    @InjectRepository(TenantKnowledge)
    private readonly tenantRepo: Repository<TenantKnowledge>,
    private readonly synthesisService: KnowledgeSynthesisService,
    private readonly tokenizer: TokenizerService,
    private readonly embeddingService: EmbeddingService,
    private readonly salesGateway: SalesGateway,
  ) {
    super();
  }

  async onModuleInit() {
    // Register repeatable job: every 30 minutes
    const jobs = await this.synthesisQueue.getRepeatableJobs();
    if (!jobs.some((j) => j.name === 'run')) {
      await this.synthesisQueue.add(
        'run',
        {},
        { repeat: { every: 30 * 60 * 1000 } },
      );
      this.logger.log(
        'Registered repeatable knowledge-synthesis job (every 30m)',
      );
    }
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Starting knowledge synthesis pass (job: ${job.id})`);

    // 1. Fetch unsynthesized chunks
    const globalChunks = await this.globalRepo.find({
      where: { synthesized: false, isSynthesis: false },
      take: 50,
    });

    const tenantChunks = await this.tenantRepo.find({
      where: { synthesized: false, isSynthesis: false },
      take: 50,
    });

    if (globalChunks.length === 0 && tenantChunks.length === 0) {
      this.logger.log('No new chunks to synthesize, exiting.');
      return;
    }

    // 2. Group global chunks by domain
    const globalGroups = this.groupBy(
      globalChunks,
      (c) => c.domain || 'general',
    );

    // 3. Group tenant chunks by (tenantId, domain)
    const tenantGroups = this.groupBy(
      tenantChunks,
      (c) => `${c.tenantId}|${c.domain || 'general'}`,
    );

    // 4. Process global groups
    for (const [domain, chunks] of Object.entries(globalGroups)) {
      try {
        await this.processSynthesis(chunks, domain);
      } catch (error) {
        this.logger.error(
          `Failed to synthesize global domain ${domain}: ${error.message}`,
        );
      }
    }

    // 5. Process tenant groups
    for (const [key, chunks] of Object.entries(tenantGroups)) {
      const [tenantId, domain] = key.split('|');
      try {
        await this.processSynthesis(chunks, domain, tenantId);
      } catch (error) {
        this.logger.error(
          `Failed to synthesize tenant ${tenantId} domain ${domain}: ${error.message}`,
        );
      }
    }

    this.logger.log('Knowledge synthesis pass complete');
  }

  private async processSynthesis(
    chunks: any[],
    domain: string,
    tenantId?: string,
  ) {
    this.logger.log(
      `Synthesizing ${chunks.length} chunks for ${tenantId ? `tenant ${tenantId}` : 'global'} domain ${domain}`,
    );

    const synthesizedText = await this.synthesisService.synthesize(chunks);
    if (!synthesizedText) {
      this.logger.warn(
        `Synthesis returned empty for ${domain}, skipping update`,
      );
      return;
    }

    // Embed synthesized text
    let embedding: number[] | null = null;
    try {
      // Embedding service might have length limits, take first 2000 chars for safety
      embedding = await this.embeddingService.embed(
        synthesizedText.substring(0, 2000),
      );
    } catch (e) {
      this.logger.warn(
        `Embedding failed for synthesis in ${domain}, proceeding without embedding`,
      );
    }

    // Insert synthesis row & update source chunks
    const entityData = {
      content: synthesizedText,
      tokenCount: this.tokenizer.countTokens(synthesizedText),
      sourceUrl: chunks[0].sourceUrl, // representative source
      domain: domain,
      embedding: embedding || undefined,
      synthesized: true,
      isSynthesis: true,
      status: 'active' as const,
    };

    if (tenantId) {
      const entity = this.tenantRepo.create({ ...entityData, tenantId });
      await this.tenantRepo.save(entity);
      const chunkIds = chunks.map((c) => c.id);
      await this.tenantRepo.update({ id: In(chunkIds) }, { synthesized: true });
    } else {
      const entity = this.globalRepo.create(entityData);
      await this.globalRepo.save(entity);
      const chunkIds = chunks.map((c) => c.id);
      await this.globalRepo.update({ id: In(chunkIds) }, { synthesized: true });
    }

    // Emit WebSocket event
    this.salesGateway.server.emit('knowledge_synthesized', {
      domain,
      chunksProcessed: chunks.length,
      tenantId: tenantId || null,
    });
  }

  private groupBy<T>(
    array: T[],
    keyGetter: (item: T) => string,
  ): Record<string, T[]> {
    const groups: Record<string, T[]> = {};
    for (const item of array) {
      const key = keyGetter(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return groups;
  }
}
