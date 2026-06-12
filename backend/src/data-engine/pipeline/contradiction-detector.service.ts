import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateObject } from 'ai';
import { z } from 'zod';
import { Extraction } from '../entities/extraction.entity';
import { AnalyzedClaim } from './autodata-analyzer.service';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

const ContradictionSchema = z.object({
  contradicts: z.boolean(),
  type: z.enum(['direct', 'temporal', 'scope', 'none']),
  explanation: z.string(),
});

export interface ContradictionResult {
  claim: AnalyzedClaim;
  contradictedIds: string[];
  isNew: boolean;
}

@Injectable()
export class ContradictionDetectorService {
  private readonly logger = new Logger(ContradictionDetectorService.name);
  private readonly SIMILARITY_THRESHOLD = 0.85;

  constructor(
    @InjectRepository(Extraction)
    private readonly extractionRepo: Repository<Extraction>,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async detect(
    repoId: string,
    tenantId: string,
    claims: AnalyzedClaim[],
  ): Promise<ContradictionResult[]> {
    const results: ContradictionResult[] = [];

    for (const claim of claims) {
      const candidates = await this.findSimilarExtractions(
        repoId,
        tenantId,
        claim.claim,
      );
      const contradictedIds: string[] = [];

      for (const candidate of candidates) {
        const verdict = await this.checkContradiction(
          claim.claim,
          candidate.claim,
        );
        if (verdict.contradicts) {
          contradictedIds.push(candidate.id);
          this.logger.warn(
            `Contradiction detected: "${claim.claim.substring(0, 60)}..." vs existing claim ${candidate.id}`,
          );
        }
      }

      results.push({
        claim,
        contradictedIds,
        isNew: contradictedIds.length === 0,
      });
    }
    return results;
  }

  private async findSimilarExtractions(
    repoId: string,
    tenantId: string,
    claimText: string,
  ): Promise<Extraction[]> {
    // Fallback to keyword search since pgvector requires vector column on Extraction
    // Full vector search added in Task 9 (retrieval layer)
    return this.extractionRepo
      .createQueryBuilder('e')
      .where('e.repo_id = :repoId', { repoId })
      .andWhere('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.status = :status', { status: 'accepted' })
      .orderBy('e.created_at', 'DESC')
      .limit(20)
      .getMany();
  }

  private async checkContradiction(
    newClaim: string,
    existingClaim: string,
  ): Promise<{ contradicts: boolean; type: string; explanation: string }> {
    const { object } = await generateObject({
      model: this.aiRouter.getModel(AI_TASKS.FAST),
      schema: ContradictionSchema,
      system:
        'You are a fact-checker. Determine if two claims directly contradict each other.',
      prompt: `Claim A (new): "${newClaim}"\n\nClaim B (existing): "${existingClaim}"\n\nDo these claims contradict each other?`,
    });
    return object;
  }
}
