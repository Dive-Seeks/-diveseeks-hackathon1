import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import {
  HarnessCandidate,
  HarnessConfig,
} from './entities/harness-candidate.entity';
import { EvalHarnessService, TaskInput } from './eval-harness.service';
import { Agent } from '../agents/entities/agent.entity';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import * as fs from 'fs';
import * as path from 'path';

const HarnessMutationSchema = z.object({
  config: z.object({
    judgeSystemPrompt: z.string(),
    weakThreshold: z.number().min(0.2).max(0.8),
    strongThreshold: z.number().min(0.4).max(0.95),
    gapThreshold: z.number().min(0.1).max(0.5),
    weakRuns: z.number().int().min(3).max(10),
    strongRuns: z.number().int().min(2).max(8),
    judgeCount: z.number().int().min(3).max(15),
    analyzerFeedbackTemplate: z.string(),
    positiveOnlyRubric: z.boolean(),
    maxCriterionWeight: z.number().int().min(3).max(10),
    contextLeakCheck: z.string(),
  }),
  diffDescription: z.string(),
  rootCauseAnalysis: z.string(),
  discoveredPatterns: z.array(z.string()),
});

/**
 * Meta-Optimization Service — The Outer Loop
 *
 * Implements Facebook RAM Autodata's meta-optimizer:
 * 1. Select parent from population via Boltzmann sampling
 * 2. Evaluate parent harness on training tasks
 * 3. Analyze trajectories for systematic failure patterns
 * 4. Implement harness modifications via LLM code-editing agent
 * 5. Re-evaluate mutant on validation tasks
 * 6. Accept or reject (validation score must strictly exceed parent's)
 * 7. Summarize outcome into history log
 */
@Injectable()
export class MetaOptimizerService {
  private readonly logger = new Logger(MetaOptimizerService.name);
  private readonly MAX_ITERATIONS = 20;
  private readonly BOLTZMANN_TEMPERATURE = 0.1;
  private readonly TRAIN_PAPERS = 50;
  private readonly VAL_PAPERS = 25;

  constructor(
    @InjectRepository(HarnessCandidate)
    private readonly candidateRepo: Repository<HarnessCandidate>,
    private readonly evalHarness: EvalHarnessService,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly aiRouter: AiProviderRouter,
    private readonly dataSource: DataSource,
  ) {}

  async runMetaOptimization(tenantId: string): Promise<void> {
    this.logger.log('[Meta-Optimizer] Starting meta-optimization cycle...');

    // Ensure seed candidate exists
    await this.ensureSeedCandidate();

    for (let iter = 0; iter < this.MAX_ITERATIONS; iter++) {
      this.logger.log(
        `[Meta-Optimizer] Iteration ${iter + 1}/${this.MAX_ITERATIONS}`,
      );

      // Step 1: Select parent via Boltzmann sampling (tenant-scoped + global seeds)
      const parent = await this.selectParent(tenantId);
      if (!parent) {
        this.logger.warn(
          '[Meta-Optimizer] No candidates in population — aborting',
        );
        return;
      }

      // Step 2: Evaluate parent on training tasks
      const trainTasks = await this.loadRecentTasks(
        tenantId,
        this.TRAIN_PAPERS,
      );
      if (trainTasks.length < 10) {
        this.logger.warn(
          `[Meta-Optimizer] Not enough tasks (${trainTasks.length}) — skipping`,
        );
        return;
      }

      const trainResults = await this.evalHarness.evalBatch(
        trainTasks.slice(0, this.TRAIN_PAPERS),
        this.buildSpecialistPromptFromConfig(parent.config),
      );

      const trainGap = this.computeGap(trainResults);

      // Step 3: Analyze trajectories for root cause
      const trajectories = await this.loadTrajectoryHistory(tenantId);
      const populationHistory = await this.getPopulationHistory(tenantId);

      // Step 4: Implement harness modification via LLM
      const mutation = await this.generateMutation(
        parent,
        trainResults,
        trajectories,
        populationHistory,
      );

      // Step 5: Create mutant candidate
      const mutant = await this.candidateRepo.save(
        this.candidateRepo.create({
          parentId: parent.id,
          tenantId: tenantId === 'global' ? null : tenantId,
          generation: parent.generation + 1,
          config: mutation.config,
          status: 'evaluating',
          diffDescription: mutation.diffDescription,
          rootCauseAnalysis: mutation.rootCauseAnalysis,
          discoveredPatterns: mutation.discoveredPatterns,
        }),
      );

      // Step 6: Re-evaluate BOTH parent and mutant on validation tasks
      const valTasks = await this.loadRecentTasks(tenantId, this.VAL_PAPERS);

      const [parentValResults, mutantValResults] = await Promise.all([
        this.evalHarness.evalBatch(
          valTasks.slice(0, this.VAL_PAPERS),
          this.buildSpecialistPromptFromConfig(parent.config),
        ),
        this.evalHarness.evalBatch(
          valTasks.slice(0, this.VAL_PAPERS),
          this.buildSpecialistPromptFromConfig(mutation.config),
        ),
      ]);

      const parentValGap = this.computeGap(parentValResults);
      const mutantValGap = this.computeGap(mutantValResults);

      // Step 7: Accept or reject
      if (mutantValGap > parentValGap) {
        await this.candidateRepo.update(mutant.id, {
          status: 'accepted',
          trainScore: trainGap,
          trainGap,
          valScore: mutantValGap,
          valGap: mutantValGap,
          evaluatedAt: new Date(),
        });
        this.logger.log(
          `[Meta-Optimizer] Iteration ${iter + 1}: ACCEPTED. ` +
            `Parent gap=${parentValGap.toFixed(3)} → Mutant gap=${mutantValGap.toFixed(3)} (+${(mutantValGap - parentValGap).toFixed(3)})`,
        );
      } else {
        await this.candidateRepo.update(mutant.id, {
          status: 'rejected',
          trainScore: trainGap,
          trainGap,
          valScore: mutantValGap,
          valGap: mutantValGap,
          evaluatedAt: new Date(),
        });
        this.logger.log(
          `[Meta-Optimizer] Iteration ${iter + 1}: REJECTED. ` +
            `Parent gap=${parentValGap.toFixed(3)} ≥ Mutant gap=${mutantValGap.toFixed(3)}`,
        );
      }

      // Step 8: Log to history
      await this.appendHistory(
        tenantId,
        iter + 1,
        parent,
        mutant,
        parentValGap,
        mutantValGap,
      );
    }

    this.logger.log('[Meta-Optimizer] Meta-optimization cycle complete.');
  }

  /**
   * Discovers all active tenants with a coordinator agent and runs per-tenant
   * meta-optimization. Falls back to the global seed pool when no tenants exist.
   */
  async getHistory(tenantId: string): Promise<HarnessCandidate[]> {
    return this.candidateRepo.find({
      where: [{ tenantId }, { tenantId: null }] as any,
      order: { generation: 'DESC' } as any,
      take: 50,
    });
  }

  async getActiveCandidate(tenantId: string): Promise<HarnessCandidate | null> {
    return this.candidateRepo.findOne({
      where: { tenantId, status: 'accepted' } as any,
      order: { valGap: 'DESC' } as any,
    });
  }

  async runMetaOptimizationForAllTenants(): Promise<void> {
    const rows: { tenantId: string }[] = await this.agentRepo
      .createQueryBuilder('a')
      .select('a.tenantId', 'tenantId')
      .distinct(true)
      .where('a.role = :role', { role: 'coordinator' })
      .andWhere('a.status != :status', { status: 'terminated' })
      .getRawMany();

    if (rows.length === 0) {
      this.logger.log(
        '[Meta-Optimizer] No active tenants — running global fallback',
      );
      await this.runMetaOptimization('global');
      return;
    }

    this.logger.log(
      `[Meta-Optimizer] Running per-tenant optimization for ${rows.length} tenants`,
    );
    for (const { tenantId } of rows) {
      await this.runMetaOptimization(tenantId);
    }
  }

  /**
   * Boltzmann sampling: P(candidate c) ∝ exp(score_c / T)
   * Temperature T=0.1 strongly favours high-scoring candidates while maintaining exploration.
   */
  private async selectParent(
    tenantId: string,
  ): Promise<HarnessCandidate | null> {
    const tid = tenantId === 'global' ? null : tenantId;
    // Include tenant-specific candidates and global seed candidates (tenantId IS NULL)
    const candidates = await this.candidateRepo.find({
      where: [
        { status: 'accepted', tenantId: tid },
        { status: 'pending', tenantId: tid },
        { status: 'accepted', tenantId: null },
      ] as any,
      order: { valGap: 'DESC' },
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const scores = candidates.map((c) => Number(c.valGap) || 0);
    const expScores = scores.map((s) =>
      Math.exp(s / this.BOLTZMANN_TEMPERATURE),
    );
    const totalExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map((e) => e / totalExp);

    // Weighted random selection
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < candidates.length; i++) {
      cumulative += probabilities[i];
      if (r <= cumulative) return candidates[i];
    }

    return candidates[candidates.length - 1];
  }

  private async generateMutation(
    parent: HarnessCandidate,
    trainResults: any[],
    trajectories: string[],
    populationHistory: string[],
  ): Promise<z.infer<typeof HarnessMutationSchema>> {
    const failedTasks = trainResults.filter((r) => r.weakScore > 0.5);
    const passedTasks = trainResults.filter((r) => r.passedCriterion);

    const result = await generateText({
      model: this.aiRouter.getEvolveModel('analyzer'),
      experimental_output: Output.object({ schema: HarnessMutationSchema }),
      prompt: `You are meta-optimizing an AI evaluation harness. Your goal is to modify the harness configuration so that it produces better weak-strong separation on evaluation tasks.

Current harness config:
${JSON.stringify(parent.config, null, 2)}

Evaluation results (${trainResults.length} tasks):
- Tasks where weak scored too well (need harder): ${failedTasks.length}
- Tasks that passed criterion: ${passedTasks.length}
- Avg weak: ${this.avg(trainResults.map((r) => r.weakScore)).toFixed(3)}
- Avg strong: ${this.avg(trainResults.map((r) => r.strongScore)).toFixed(3)}
- Avg gap: ${this.avg(trainResults.map((r) => r.gap)).toFixed(3)}

Failed task examples (weak solved too easily):
${failedTasks
  .slice(0, 5)
  .map(
    (t) =>
      `  • "${t.taskDescription?.substring(0, 80)}..." — weak=${t.weakScore.toFixed(2)}`,
  )
  .join('\n')}

Previous population history (last 10 iterations):
${populationHistory.slice(-10).join('\n')}

Recent trajectory patterns:
${trajectories.slice(-10).join('\n')}

Produce a MODIFIED harness config that addresses the systematic failure patterns.

Key discoveries from Facebook Autodata research (apply these):
1. Positive-only rubric with weight capping eliminates negative criteria that misfired
2. Context leak prevention: context must describe problem domain, never the solution
3. Paper-specific insight enforcement: "If a solver could answer correctly without reading the source, the question is too easy"
4. Strict JSON format for rubric criteria with integer weights prevents parsing errors

IMPORTANT: Only change what the analysis requires. Preserve working aspects.`,
    });

    return result.experimental_output;
  }

  private async ensureSeedCandidate(): Promise<void> {
    // Only check for the global seed (tenantId IS NULL) — per-tenant candidates don't block bootstrap
    const count = await this.candidateRepo.count({
      where: { tenantId: null } as any,
    });
    if (count > 0) return;

    await this.candidateRepo.save(
      this.candidateRepo.create({
        generation: 0,
        status: 'accepted',
        valGap: 0.14,
        config: this.getDefaultConfig(),
        diffDescription: 'Seed candidate — baseline harness configuration',
      }),
    );
    this.logger.log('[Meta-Optimizer] Seed candidate created');
  }

  private getDefaultConfig(): HarnessConfig {
    return {
      judgeSystemPrompt:
        'You are an expert judge for an AI coding specialist system. Evaluate accuracy, security (tenant_id isolation), code quality, and adherence to project patterns.',
      weakThreshold: 0.5,
      strongThreshold: 0.6,
      gapThreshold: 0.25,
      weakRuns: 5,
      strongRuns: 3,
      judgeCount: 8,
      analyzerFeedbackTemplate:
        'Claims were too easy — weak solver scored {weakScore}. Generate more specific, technical claims that require domain knowledge to answer.',
      positiveOnlyRubric: true,
      maxCriterionWeight: 7,
      contextLeakCheck:
        'Could someone answer the question by rephrasing sentences from the context? If yes, rewrite the context to describe only the problem domain, not the solution.',
    };
  }

  private buildSpecialistPromptFromConfig(config: HarnessConfig): string {
    return `${config.judgeSystemPrompt}

EVALUATION RULES:
- Weak solver must score ≤ ${config.weakThreshold * 100}%
- Strong solver must score ≥ ${config.strongThreshold * 100}%
- Gap must be ≥ ${config.gapThreshold * 100}%
${config.positiveOnlyRubric ? '- Use POSITIVE-ONLY rubric criteria (no negative weights)' : ''}
- Max criterion weight: ${config.maxCriterionWeight}

CONTEXT LEAK CHECK: ${config.contextLeakCheck}`;
  }

  private computeGap(results: any[]): number {
    if (results.length === 0) return 0;
    const avgWeak = this.avg(results.map((r) => r.weakScore));
    const avgStrong = this.avg(results.map((r) => r.strongScore));
    return avgStrong - avgWeak;
  }

  private async loadRecentTasks(
    tenantId: string,
    limit: number,
  ): Promise<TaskInput[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT task_description, '' AS context, id AS trajectory_id
         FROM task_trajectories
         WHERE tenant_id = $1 AND approved = true
         ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit],
      );
      if (rows.length === 0) {
        this.logger.warn(
          `[MetaOptimizer] No trajectories for tenant ${tenantId}`,
        );
      }
      return rows.map((r: any) => ({
        taskDescription: r.task_description,
        context: r.context ?? '',
        trajectoryId: r.trajectory_id,
      }));
    } catch (err) {
      this.logger.error(
        `[MetaOptimizer] Failed to load recent tasks for tenant ${tenantId}`,
        (err as Error).stack,
      );
      return [];
    }
  }

  private async loadTrajectoryHistory(tenantId: string): Promise<string[]> {
    try {
      const rows = await this.dataSource.query(
        `SELECT task_description
         FROM task_trajectories
         WHERE tenant_id = $1
         ORDER BY created_at DESC LIMIT 400`,
        [tenantId],
      );
      return rows.map((r: any) => r.task_description as string);
    } catch (err) {
      this.logger.error(
        `[MetaOptimizer] Failed to load trajectory history for tenant ${tenantId}`,
        (err as Error).stack,
      );
      return [];
    }
  }

  private async getPopulationHistory(tenantId: string): Promise<string[]> {
    const tid = tenantId === 'global' ? null : tenantId;
    const candidates = await this.candidateRepo.find({
      where: [{ tenantId: tid }, { tenantId: null }] as any,
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return candidates.map(
      (c) =>
        `Gen ${c.generation} [${c.status}] gap=${Number(c.valGap)?.toFixed(3) || '?'} — ${c.diffDescription?.substring(0, 100) || 'no description'}`,
    );
  }

  private async appendHistory(
    tenantId: string,
    iteration: number,
    parent: HarnessCandidate,
    mutant: HarnessCandidate,
    parentGap: number,
    mutantGap: number,
  ): Promise<void> {
    const dir = path.join(process.cwd(), 'data', 'meta-optimizer', tenantId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const logPath = path.join(dir, 'history.jsonl');
    const entry = {
      iteration,
      timestamp: new Date().toISOString(),
      parentId: parent.id,
      mutantId: mutant.id,
      parentGap,
      mutantGap,
      accepted: mutantGap > parentGap,
      diffDescription: mutant.diffDescription,
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Audit-Driven Evolution (Gap G)
   * Suggests mutations for an audit rubric based on recurring findings/mistakes.
   */
  async suggestRubricMutation(
    phase: string,
    currentCriteria: any[],
    findings: any[],
  ): Promise<{ suggestedCriteria: any[]; rationale: string }> {
    this.logger.log(
      `[Meta-Optimizer] Analyzing ${findings.length} findings to evolve ${phase} rubric`,
    );

    const result = await generateText({
      model: this.aiRouter.getEvolveModel('analyzer'),
      experimental_output: Output.object({
        schema: z.object({
          suggestedCriteria: z.array(
            z.object({
              name: z.string(),
              description: z.string(),
              weight: z.number().int().min(1).max(10),
              scoringPrompt: z.string(),
            }),
          ),
          rationale: z.string(),
        }),
      }),
      prompt: `You are meta-optimizing an autonomous audit system. 
      
      The current audit rubric for phase "${phase}" has these criteria:
      ${JSON.stringify(currentCriteria, null, 2)}
      
      We have discovered the following recurring findings/mistakes during recent executions:
      ${JSON.stringify(findings.slice(-20), null, 2)}
      
      Based on these mistakes, modify the rubric criteria to be more strict or specific in areas where the system is currently failing.
      - Add new criteria if a recurring failure mode is not covered.
      - Update existing criteria to be more technically precise.
      - Adjust weights to prioritize critical failure modes (like security or logic errors).
      
      IMPORTANT: Return the FULL list of criteria (including unchanged ones) that should form the new rubric.`,
    });

    return result.experimental_output;
  }
}
