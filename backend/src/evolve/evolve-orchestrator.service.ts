import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource } from 'typeorm';
import { EvolveCycle } from './entities/evolve-cycle.entity';
import { SpecialistPromptVersion } from './entities/specialist-prompt-version.entity';
import { EvalHarnessService, TaskInput } from './eval-harness.service';
import { EvolveAnalyzerService } from './evolve-analyzer.service';
import { EvolveImplementService } from './evolve-implement.service';
import { PromptVersionService } from './prompt-version.service';
import { HermesGateway } from '../hermes/hermes.gateway';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { AgentChatService } from '../agent-chat/agent-chat.service';

export interface ConvergenceReport {
  specialistId: string;
  completedIterations: number;
  latestScore: number;
  baselineScore: number;
  convergenceVelocity: number;
  trend: 'converging' | 'stalled' | 'diverging';
  stalledCount: number;
}

@Injectable()
export class EvolveOrchestrator {
  private readonly logger = new Logger(EvolveOrchestrator.name);
  private readonly MAX_ITERATIONS = 10;
  private readonly TRAIN_BATCH = 50;
  private readonly VAL_BATCH = 25;
  private readonly PASS_WEAK = 0.5;
  private readonly PASS_STRONG = 0.6;
  private readonly PASS_GAP = 0.25;

  constructor(
    @InjectRepository(EvolveCycle)
    private readonly cycleRepo: Repository<EvolveCycle>,
    @InjectRepository(SpecialistPromptVersion)
    private readonly promptVersionRepo: Repository<SpecialistPromptVersion>,
    private readonly evalHarness: EvalHarnessService,
    private readonly analyzerService: EvolveAnalyzerService,
    private readonly implementService: EvolveImplementService,
    private readonly promptVersionService: PromptVersionService,
    private readonly redisCache: RedisCacheService,
    private readonly dataSource: DataSource,
    @Optional() private readonly gateway?: HermesGateway,
    @Optional() private readonly agentChat?: AgentChatService,
  ) {}

  async runCycle(specialistId: string, tenantId: string): Promise<void> {
    this.logger.log(
      `[Evolve] Starting evolution cycle for ${specialistId} (tenant: ${tenantId})`,
    );
    let iteration = 0;

    while (iteration < this.MAX_ITERATIONS) {
      iteration++;
      const cycle = await this.cycleRepo.save({
        specialistId,
        iteration,
        status: 'running',
        trainBatchSize: this.TRAIN_BATCH,
        valBatchSize: this.VAL_BATCH,
      });

      // Select best known parent prompt
      const parentVersion = await this.selectBestParent(specialistId);
      const currentPrompt =
        parentVersion?.systemPrompt || this.getDefaultPrompt(specialistId);

      // --- STEP 1: EVAL (train batch × 50) ---
      const existingVersions = await this.promptVersionRepo.count({
        where: { specialistId, version: MoreThan(1) },
      });

      const bootstrapThreshold = process.env.EVOLVE_BOOTSTRAP_THRESHOLD
        ? parseInt(process.env.EVOLVE_BOOTSTRAP_THRESHOLD)
        : 10;
      const steadyThreshold = process.env.EVOLVE_STEADY_THRESHOLD
        ? parseInt(process.env.EVOLVE_STEADY_THRESHOLD)
        : 50;

      const currentThreshold =
        existingVersions === 0 ? bootstrapThreshold : steadyThreshold;

      const trainTasks = await this.loadRecentTasks(tenantId, currentThreshold);
      if (trainTasks.length < currentThreshold) {
        this.logger.warn(
          `[Evolve] Not enough tasks found for ${specialistId} (${trainTasks.length} < ${currentThreshold}). Skipping.`,
        );
        await this.cycleRepo.update(cycle.id, {
          status: 'skipped',
          diagnosis: 'NOT_ENOUGH_TASKS',
        });
        return;
      }

      const trainResults = await this.evalHarness.evalBatch(
        trainTasks,
        currentPrompt,
      );

      const avgWeak = this.avg(trainResults.map((r) => r.weakScore));
      const avgStrong = this.avg(trainResults.map((r) => r.strongScore));
      const avgGap = avgStrong - avgWeak;

      await this.cycleRepo.update(cycle.id, {
        trainWeakScore: avgWeak,
        trainStrongScore: avgStrong,
        trainGap: avgGap,
      });

      // --- Gap sufficient? ---
      if (
        avgWeak <= this.PASS_WEAK &&
        avgStrong >= this.PASS_STRONG &&
        avgGap >= this.PASS_GAP
      ) {
        this.logger.log(
          `[Evolve] ${specialistId} gap sufficient (${avgGap.toFixed(2)}) — no changes needed`,
        );
        await this.cycleRepo.update(cycle.id, {
          status: 'skipped',
          diagnosis: 'GAP_SUFFICIENT',
        });
        return;
      }

      // --- STEP 2: ANALYZE ---
      const diagnosis = await this.analyzerService.analyze(
        specialistId,
        tenantId,
        trainResults,
        currentPrompt,
      );

      // --- STEP 3: IMPLEMENT ---
      const patch = await this.implementService.implement(
        specialistId,
        currentPrompt,
        diagnosis,
      );

      const diagnosisText = `${diagnosis.type}: ${diagnosis.recommendation}`;

      const candidateVersion = await this.promptVersionRepo.save({
        specialistId,
        version: (parentVersion?.version || 0) + 1,
        systemPrompt: patch.newPrompt,
        isActive: false,
        status: 'pending',
        diagnosis: diagnosisText,
        changeDescription: patch.changeDescription,
        parentVersionId: parentVersion?.id,
        weakScore: avgWeak,
        strongScore: avgStrong,
        gapScore: avgGap,
        sourceTrajectoryIds: trainTasks
          .map((t) => t.trajectoryId)
          .filter(Boolean) as string[],
      });
      await this.cycleRepo.update(cycle.id, {
        promptVersionId: candidateVersion.id,
      });

      // --- STEP 4: RE-EVAL (val × 25) ---
      const valTasks = await this.loadRecentTasks(tenantId, this.VAL_BATCH);
      const valResults = await this.evalHarness.evalBatch(
        valTasks,
        candidateVersion.systemPrompt,
      );

      const valWeak = this.avg(valResults.map((r) => r.weakScore));
      const valStrong = this.avg(valResults.map((r) => r.strongScore));
      const valGap = valStrong - valWeak;

      await this.cycleRepo.update(cycle.id, {
        valWeakScore: valWeak,
        valStrongScore: valStrong,
        valGap,
      });

      // --- STEP 5: ACCEPT / REJECT ---
      if (
        valWeak <= this.PASS_WEAK &&
        valStrong >= this.PASS_STRONG &&
        valGap >= this.PASS_GAP
      ) {
        await this.activateVersion(candidateVersion);
        await this.promptVersionRepo.update(candidateVersion.id, {
          status: 'accepted',
          isActive: true,
          acceptedAt: new Date(),
          weakScore: valWeak,
          strongScore: valStrong,
          gapScore: valGap,
        });
        await this.cycleRepo.update(cycle.id, {
          status: 'accepted',
          completedAt: new Date(),
        });

        try {
          this.emitSpecialistEvolved(
            tenantId,
            specialistId,
            candidateVersion.version,
            candidateVersion.parentVersionId ?? null,
            valGap,
            diagnosisText,
          );
        } catch (wsErr) {
          this.logger.warn(`[Evolve] specialist_evolved emit failed: ${wsErr}`);
        }

        this.agentChat?.emit({
          tenantId,
          projectId: tenantId,
          threadId: `soul-${tenantId}-${specialistId}`,
          fromAgent: 'soul',
          domain: 'system',
          interactionType: 'soul_report',
          content: `${specialistId} v${candidateVersion.version} accepted. Gap improved: ${(cycle.trainGap ?? 0).toFixed(2)} → ${valGap.toFixed(2)}`,
          metadata: { specialistId, version: candidateVersion.version, valGap },
        });

        this.logger.log(
          `[Evolve] ${specialistId} v${candidateVersion.version} ACCEPTED. Gap: ${valGap.toFixed(2)}`,
        );
        return;
      } else {
        await this.promptVersionRepo.update(candidateVersion.id, {
          status: 'rejected',
          rejectedAt: new Date(),
        });
        await this.cycleRepo.update(cycle.id, {
          status: 'rejected',
          completedAt: new Date(),
        });

        this.logger.warn(
          `[Evolve] ${specialistId} v${candidateVersion.version} REJECTED. Gap ${valGap.toFixed(2)} < ${this.PASS_GAP}. Iterating.`,
        );
      }

      // [TASK 5] Convergence Check
      const report = await this.computeConvergence(specialistId, tenantId);
      await this.checkStalledGuard(specialistId, tenantId, report);
    }

    this.logger.warn(
      `[Evolve] ${specialistId} exhausted ${this.MAX_ITERATIONS} iterations without passing.`,
    );
  }

  async computeConvergence(
    specialistId: string,
    tenantId: string,
  ): Promise<ConvergenceReport> {
    const cycles = await this.cycleRepo.find({
      where: { specialistId, status: 'accepted' },
      order: { iteration: 'ASC' },
    });

    const stallKey = `evolve:stalled:${tenantId}:${specialistId}`;
    const stalledCount = (await this.redisCache.get<number>(stallKey)) ?? 0;

    if (cycles.length === 0) {
      return {
        specialistId,
        completedIterations: 0,
        latestScore: 0,
        baselineScore: 0,
        convergenceVelocity: 0,
        trend: 'stalled',
        stalledCount,
      };
    }

    const baseline = Number(cycles[0].valGap || 0);
    const latest = Number(cycles[cycles.length - 1].valGap || 0);
    const iterations = cycles.length;

    const velocity = iterations > 0 ? (latest - baseline) / iterations : 0;
    let trend: 'converging' | 'stalled' | 'diverging' = 'stalled';

    if (velocity >= 0.05) trend = 'converging';
    else if (velocity < 0) trend = 'diverging';

    return {
      specialistId,
      completedIterations: iterations,
      latestScore: latest,
      baselineScore: baseline,
      convergenceVelocity: Number(velocity.toFixed(4)),
      trend,
      stalledCount,
    };
  }

  private async checkStalledGuard(
    specialistId: string,
    tenantId: string,
    report: ConvergenceReport,
  ): Promise<void> {
    const stalledKey = `evolve:stalled:${specialistId}:${tenantId}`;
    if (report.trend === 'stalled') {
      const current = (await this.redisCache.get<number>(stalledKey)) || 0;
      const updated = current + 1;
      await this.redisCache.set(stalledKey, updated, 3600 * 24); // 24h reset

      if (updated >= 3) {
        this.logger.warn(
          `[Evolve] Specialist ${specialistId} has STALLED for 3 consecutive iterations. Emitting alert.`,
        );
        if (this.gateway?.server) {
          this.gateway.server
            .to(`tenant:${tenantId}`)
            .emit('evolve:stalled', { specialistId, report });
        }
        this.agentChat?.emit({
          tenantId,
          projectId: tenantId,
          threadId: `soul-${tenantId}-${specialistId}`,
          fromAgent: 'soul',
          domain: 'system',
          interactionType: 'soul_report',
          content: `${specialistId} has stalled for 3 consecutive evolution cycles. Human review recommended.`,
          metadata: { specialistId, stalledCount: report.stalledCount },
        });
      }
    } else {
      await this.redisCache.del(stalledKey);
    }
  }

  private async selectBestParent(
    specialistId: string,
  ): Promise<SpecialistPromptVersion | null> {
    const candidates = await this.promptVersionRepo.find({
      where: { specialistId, status: 'accepted' },
      order: { version: 'DESC' },
      take: 5,
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // [TASK 6] Weighted Ancestry Sampling
    // Exponential decay weights: [1.0, 0.5, 0.25, 0.125, 0.0625]
    const weights = candidates.map((_, i) => Math.pow(0.5, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Weighted random selection
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < candidates.length; i++) {
      cumulative += normalizedWeights[i];
      if (random <= cumulative) {
        this.logger.debug(
          `[Evolve] Ancestry Sample: selected v${candidates[i].version} (weight: ${normalizedWeights[i].toFixed(4)})`,
        );
        return candidates[i];
      }
    }

    return candidates[0]; // Fallback to most recent
  }

  private async activateVersion(
    version: SpecialistPromptVersion,
  ): Promise<void> {
    // Deactivate others
    await this.promptVersionRepo.update(
      { specialistId: version.specialistId, isActive: true },
      { isActive: false },
    );
    // Invalidate cache
    await this.promptVersionService.invalidateCache(version.specialistId);
  }

  private async loadRecentTasks(
    tenantId: string,
    limit: number,
  ): Promise<TaskInput[]> {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidRe.test(tenantId)) {
      this.logger.warn(
        `[EvolveOrchestrator] tenantId "${tenantId}" is not a valid UUID — skipping trajectory load.`,
      );
      return [];
    }
    try {
      const rows = await this.dataSource.query(
        `SELECT task_description, '' AS context, id AS trajectory_id
         FROM task_trajectories
         WHERE tenant_id = $1
           AND approved = true
         ORDER BY created_at DESC
         LIMIT $2`,
        [tenantId, limit],
      );

      if (rows.length === 0) {
        this.logger.warn(
          `[EvolveOrchestrator] No trajectories found for tenant ${tenantId} — minimum ${limit} required. Evolve will skip.`,
        );
      } else {
        this.logger.log(
          `[EvolveOrchestrator] Loaded ${rows.length} trajectories for tenant ${tenantId}`,
        );
      }

      return rows.map((r: any) => ({
        taskDescription: r.task_description,
        context: r.context ?? '',
        trajectoryId: r.trajectory_id,
      }));
    } catch (err) {
      this.logger.error(
        `[EvolveOrchestrator] Failed to load trajectories for tenant ${tenantId}`,
        (err as Error).stack,
      );
      return [];
    }
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private emitSpecialistEvolved(
    tenantId: string,
    specialistId: string,
    version: number,
    parentVersionId: string | null,
    gapScore: number,
    diagnosis: string,
  ): void {
    if (!this.gateway?.server) return;
    this.gateway.server.to(`tenant:${tenantId}`).emit('specialist_evolved', {
      specialistId,
      version,
      parentVersionId,
      gapScore,
      diagnosis,
      acceptedAt: new Date().toISOString(),
    });
  }

  private getDefaultPrompt(specialistId: string): string {
    // This will be replaced by the hardcoded prompts in specialists.ts if needed
    return '';
  }
}
