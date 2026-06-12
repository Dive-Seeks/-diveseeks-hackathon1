import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as crypto from 'crypto';
import {
  ContinuationRegistry,
  ContinuationStatus,
} from './entities/continuation-registry.entity';
import { ErrorRegistry, ErrorSeverity } from './entities/error-registry.entity';
import { SolutionRegistry } from './entities/solution-registry.entity';

export interface ProblemDescriptor {
  errorType: string;
  message: string;
  context: Record<string, any>;
  tenantId: string;
  mcpId?: string;
  specialistId?: string;
  taskId?: string;
  severity?: ErrorSeverity;
  stack?: string;
}

export interface SolutionResult {
  found: boolean;
  solution: string | null;
  solutionId: string | null;
  confidence: number;
  matchType: 'exact' | 'semantic' | 'none';
  domain?: string;
  similarity?: number;
  candidates?: SolutionRegistry[];
}

export const COSINE_THRESHOLDS: Record<string, number> = {
  code_fix: 0.72,
  architecture: 0.65,
  ux_copy: 0.6,
  general: 0.55,
};

@Injectable()
export class KnowledgeRegistrarService {
  private readonly logger = new Logger(KnowledgeRegistrarService.name);

  constructor(
    @InjectRepository(ContinuationRegistry)
    private readonly continuationRepo: Repository<ContinuationRegistry>,
    @InjectRepository(ErrorRegistry)
    private readonly errorRepo: Repository<ErrorRegistry>,
    @InjectRepository(SolutionRegistry)
    private readonly solutionRepo: Repository<SolutionRegistry>,
  ) {}

  // ── Continuation Registry ──────────────────────────────────────────────────

  async pauseTask(
    tenantId: string,
    taskId: string,
    pausedAtPhase: string,
    pauseReason: string,
    resumeContext: Record<string, any>,
    opts: { workflowExecutionId?: string; auditLoopId?: string } = {},
  ): Promise<ContinuationRegistry> {
    return this.continuationRepo.save(
      this.continuationRepo.create({
        tenantId,
        taskId,
        pausedAtPhase,
        pauseReason,
        resumeContext,
        status: ContinuationStatus.PAUSED,
        workflowExecutionId: opts.workflowExecutionId ?? null,
        auditLoopId: opts.auditLoopId ?? null,
      }),
    );
  }

  async resumeTask(
    continuationId: string,
    payload?: Record<string, any>,
  ): Promise<ContinuationRegistry> {
    const update: any = {
      status: ContinuationStatus.RESUMED,
      resumedAt: new Date(),
    };
    if (payload) {
      // We don't merge here to avoid complex JSONB logic;
      // the payload is usually the final dispatch metadata
      update.resumeContext = payload;
    }
    await this.continuationRepo.update(continuationId, update);
    return this.continuationRepo.findOneOrFail({
      where: { id: continuationId },
    });
  }

  async getPendingContinuations(
    tenantId: string,
  ): Promise<ContinuationRegistry[]> {
    return this.continuationRepo.find({
      where: { tenantId, status: ContinuationStatus.PAUSED },
      order: { createdAt: 'ASC' },
    });
  }

  async getAllPendingContinuations(): Promise<ContinuationRegistry[]> {
    return this.continuationRepo.find({
      where: { status: ContinuationStatus.PAUSED },
      order: { createdAt: 'ASC' },
    });
  }

  // ── Error Registry ─────────────────────────────────────────────────────────

  computeErrorHash(errorType: string, contextFingerprint: string): string {
    return crypto
      .createHash('sha256')
      .update(`${errorType}:${contextFingerprint}`)
      .digest('hex');
  }

  computeContextFingerprint(context: Record<string, any>): string {
    const stable = JSON.stringify(context, Object.keys(context).sort());
    return crypto
      .createHash('sha256')
      .update(stable)
      .digest('hex')
      .slice(0, 16);
  }

  async recordError(problem: ProblemDescriptor): Promise<ErrorRegistry> {
    const contextFingerprint = this.computeContextFingerprint(problem.context);
    const errorHash = this.computeErrorHash(
      problem.errorType,
      contextFingerprint,
    );

    const existing = await this.errorRepo.findOne({ where: { errorHash } });
    if (existing) {
      await this.errorRepo.update(existing.id, {
        occurrenceCount: existing.occurrenceCount + 1,
        lastSeenAt: new Date(),
      });
      return { ...existing, occurrenceCount: existing.occurrenceCount + 1 };
    }

    return this.errorRepo.save(
      this.errorRepo.create({
        tenantId: problem.tenantId,
        errorHash,
        contextFingerprint,
        errorType: problem.errorType,
        message: problem.message,
        stack: problem.stack ?? null,
        mcpId: problem.mcpId ?? null,
        specialistId: problem.specialistId ?? null,
        taskId: problem.taskId ?? null,
        context: problem.context,
        severity: problem.severity ?? ErrorSeverity.MEDIUM,
        occurrenceCount: 1,
        lastSeenAt: new Date(),
      }),
    );
  }

  async linkErrorToSolution(
    errorId: string,
    solutionId: string,
  ): Promise<void> {
    await this.errorRepo.update(errorId, {
      solutionId,
      resolvedAt: new Date(),
    });
  }

  async getRecurringErrors(
    tenantId: string,
    sinceHours = 24,
  ): Promise<ErrorRegistry[]> {
    return this.errorRepo.find({
      where: {
        tenantId,
        createdAt: MoreThan(new Date(Date.now() - sinceHours * 3600 * 1000)),
      },
      order: { occurrenceCount: 'DESC' },
    });
  }

  // ── Solution Registry ──────────────────────────────────────────────────────

  async solveProblem(
    errorType: string,
    contextFingerprint: string,
    embeddingVector?: number[],
    domain = 'general',
  ): Promise<SolutionResult> {
    const problemHash = this.computeErrorHash(errorType, contextFingerprint);

    // Step 1: exact match — zero LLM cost
    const exact = await this.solutionRepo.findOne({ where: { problemHash } });
    if (exact) {
      await this.solutionRepo.update(exact.id, { lastUsedAt: new Date() });
      this.logger.debug(
        `Exact solution hit for hash ${problemHash.slice(0, 8)}...`,
      );
      return {
        found: true,
        solution: exact.solution,
        solutionId: exact.id,
        confidence: exact.confidenceScore,
        matchType: 'exact',
      };
    }

    // Step 2: semantic pgvector fallback — only when embedding provided
    if (embeddingVector && embeddingVector.length > 0) {
      const vecStr = `[${embeddingVector.join(',')}]`;
      const threshold = COSINE_THRESHOLDS[domain] ?? COSINE_THRESHOLDS.general;

      // Raw query to get similarity using cosine distance <=> (1 - cosine distance)
      const rawResults = await this.solutionRepo
        .createQueryBuilder('s')
        .select('s.*')
        .addSelect(
          `1 - (CAST(s.embedding AS vector) <=> CAST(:vec AS vector))`,
          'similarity',
        )
        .where('s.embedding IS NOT NULL')
        .andWhere(
          `1 - (CAST(s.embedding AS vector) <=> CAST(:vec AS vector)) >= :threshold`,
          { threshold },
        )
        .orderBy('similarity', 'DESC')
        .setParameter('vec', vecStr)
        .limit(3)
        .getRawMany();

      if (rawResults.length > 0) {
        const top = rawResults[0];
        this.logger.debug(
          `Semantic solution hit: ${top.id} with similarity ${Number(top.similarity).toFixed(4)} (threshold: ${threshold})`,
        );

        return {
          found: true,
          solution: top.solution,
          solutionId: top.id,
          confidence: Number(top.confidenceScore) * 0.8,
          matchType: 'semantic',
          domain,
          similarity: Number(Number(top.similarity).toFixed(4)),
        };
      }
    }

    return {
      found: false,
      solution: null,
      solutionId: null,
      confidence: 0,
      matchType: 'none',
    };
  }

  async recordSolution(
    errorType: string,
    contextFingerprint: string,
    solution: string,
    opts: {
      solutionPayload?: Record<string, any>;
      solvedByMcpId?: string;
      solvedBySpecialistId?: string;
      embedding?: number[];
    } = {},
  ): Promise<SolutionRegistry> {
    const problemHash = this.computeErrorHash(errorType, contextFingerprint);

    const existing = await this.solutionRepo.findOne({
      where: { problemHash },
    });
    if (existing) {
      await this.solutionRepo.update(existing.id, {
        successCount: existing.successCount + 1,
        lastUsedAt: new Date(),
        confidenceScore: Math.min(1.0, existing.confidenceScore + 0.05),
        embedding: opts.embedding
          ? `[${opts.embedding.join(',')}]`
          : existing.embedding,
      });
      return this.solutionRepo.findOneOrFail({ where: { id: existing.id } });
    }

    return this.solutionRepo.save(
      this.solutionRepo.create({
        problemHash,
        errorType,
        contextFingerprint,
        solution,
        solutionPayload: opts.solutionPayload ?? {},
        solvedByMcpId: opts.solvedByMcpId ?? null,
        solvedBySpecialistId: opts.solvedBySpecialistId ?? null,
        successCount: 1,
        confidenceScore: 0.7,
        embedding: opts.embedding ? `[${opts.embedding.join(',')}]` : null,
        lastUsedAt: new Date(),
      }),
    );
  }

  async markSolutionFailed(solutionId: string): Promise<void> {
    const s = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!s) return;
    await this.solutionRepo.update(solutionId, {
      failureCount: s.failureCount + 1,
      confidenceScore: Math.max(0.1, s.confidenceScore - 0.1),
    });
  }
}
