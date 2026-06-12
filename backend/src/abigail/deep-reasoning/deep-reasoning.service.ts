import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KnowledgeStoreService } from '../../knowledge-store/knowledge-store.service';
import { ResearchJob } from '../../web-research/entities/research-job.entity';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';
import {
  DeepReasoningInput,
  DeepReasoningResult,
} from './deep-reasoning.types';

@Injectable()
export class DeepReasoningService {
  constructor(
    private readonly knowledgeStore: KnowledgeStoreService,
    @InjectRepository(ResearchJob)
    private readonly researchJobRepo: Repository<ResearchJob>,
    // Fallback to global queue for now, or route based on tenantId dynamically if needed
    @InjectQueue('web-research-global') private webResearchQueue: Queue,
    private readonly cache: RedisCacheService,
  ) {}

  private readonly logger = new Logger(DeepReasoningService.name);

  private contentHash(text: string): string {
    return crypto
      .createHash('sha256')
      .update(text.trim().toLowerCase())
      .digest('hex');
  }

  async reason(input: DeepReasoningInput): Promise<DeepReasoningResult> {
    const key = `deepreason:${input.tenantId ?? 'global'}:${this.contentHash(input.taskDescription)}`;
    const cached = await this.cache.get<DeepReasoningResult>(key);
    if (cached) {
      this.logger.log(`[DeepReasoning] Cache hit for ${key.slice(-12)}`);
      return cached;
    }
    const result = await this.reasonUncached(input);
    await this.cache.set(key, result, 60 * 60); // 1h
    return result;
  }

  async reasonUncached(
    input: DeepReasoningInput,
  ): Promise<DeepReasoningResult> {
    // Step 1: Cache check — do we already know this?
    const cached = await this.knowledgeStore.search(
      input.taskDescription,
      input.tenantId,
      2000,
    );

    if (cached.found) {
      return {
        source: 'cache',
        knowledge: cached.chunks.map((c) => c.content),
        tokenCount: cached.totalTokens,
        researchJobId: null,
      };
    }

    // Step 2: Cache miss — trigger web research
    const domain = input.domain || this.inferDomain(input.taskDescription);

    const job = await this.researchJobRepo.save({
      query: input.taskDescription,
      tenantId: input.tenantId,
      triggeredByTaskSessionId: input.taskSessionId,
      triggerType: input.triggerType,
      status: 'pending',
    });

    await this.webResearchQueue.add('research', {
      query: input.taskDescription,
      tenantId: input.tenantId,
      jobId: job.id,
      domain,
    });

    // Step 3: Return immediately with jobId — research runs async via BullMQ
    // The task session will be updated when research completes via WebSocket event
    return {
      source: 'research_queued',
      knowledge: [],
      tokenCount: 0,
      researchJobId: job.id,
    };
  }

  async getJobStatus(jobId: string): Promise<ResearchJob> {
    const job = await this.researchJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error('Research job not found');
    }
    return job;
  }

  private inferDomain(query: string): string {
    const q = query.toLowerCase();
    if (q.includes('robot') || q.includes('automation')) return 'robotics';
    if (q.includes('health') || q.includes('medical') || q.includes('doctor'))
      return 'healthcare';
    if (q.includes('law') || q.includes('legal') || q.includes('attorney'))
      return 'legal';
    if (q.includes('code') || q.includes('software') || q.includes('develop'))
      return 'software';
    if (q.includes('finance') || q.includes('bank') || q.includes('stock'))
      return 'finance';
    return 'general';
  }
}
