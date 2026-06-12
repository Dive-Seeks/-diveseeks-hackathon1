import { Injectable, Logger } from '@nestjs/common';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { DataSource } from 'typeorm';
import { EvalResult } from './eval-harness.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

export type DiagnosisType =
  | 'GAP_SUFFICIENT' // pass — no action needed
  | 'WEAK_TOO_HIGH' // weak model scores too well — context leaks answer
  | 'STRONG_TOO_LOW' // strong model not performing — prompt too vague
  | 'BOTH_FAILING' // both models score low — task description broken
  | 'INCONSISTENT'; // high variance — rubric criteria unclear

export interface EvolveDiagnosis {
  type: DiagnosisType;
  avgWeakScore: number;
  avgStrongScore: number;
  avgGap: number;
  failedCriteria: string[]; // which judge criteria show smallest gap
  trajectoryPatterns: string[]; // patterns read from JSONL files
  recommendation: string; // what the implementer should change
  rawAnalysis: string; // full LLM reasoning (for audit)
}

const DiagnosisSchema = z.object({
  type: z.enum([
    'GAP_SUFFICIENT',
    'WEAK_TOO_HIGH',
    'STRONG_TOO_LOW',
    'BOTH_FAILING',
    'INCONSISTENT',
  ]),
  failedCriteria: z.array(z.string()),
  trajectoryPatterns: z.array(z.string()),
  recommendation: z.string(),
  rawAnalysis: z.string(),
});

@Injectable()
export class EvolveAnalyzerService {
  private readonly logger = new Logger(EvolveAnalyzerService.name);

  constructor(
    private readonly aiRouter: AiProviderRouter,
    private readonly dataSource: DataSource,
  ) {}

  async analyze(
    specialistId: string,
    tenantId: string,
    evalResults: EvalResult[],
    currentPrompt: string,
  ): Promise<EvolveDiagnosis> {
    this.logger.log(`Analyzing evolution cycle for ${specialistId}...`);

    const avgWeak = this.avg(evalResults.map((r) => r.weakScore));
    const avgStrong = this.avg(evalResults.map((r) => r.strongScore));
    const avgGap = avgStrong - avgWeak;

    const trajectories = await this.loadTrajectories(tenantId);
    const approvedPatterns = trajectories
      .filter((t) => t.completed)
      .map((t) => t.summary);
    const rejectedPatterns = trajectories
      .filter((t) => !t.completed)
      .map((t) => t.summary);

    const failedTasks = evalResults.filter((r) => r.weakScore > 0.5);

    // Build emotion breakdown for richer LLM context
    const sadnessCount = trajectories.filter(
      (t) => t.emotionTag === 'sadness',
    ).length;
    const prdMissCount = trajectories.filter(
      (t) => t.failureClass === 'prd_miss',
    ).length;
    const correctionCount = trajectories.filter(
      (t) => t.emotionTag === 'anger',
    ).length;
    const fearCount = trajectories.filter(
      (t) => t.emotionTag === 'fear',
    ).length;
    const emotionContext =
      trajectories.length > 0
        ? `Emotion breakdown (last ${trajectories.length} trajectories): ` +
          `sadness=${sadnessCount}, prd_miss=${prdMissCount}, ` +
          `corrections=${correctionCount}, security_events=${fearCount}`
        : '';

    const result = await generateText({
      model: this.aiRouter.getEvolveModel('analyzer'),
      experimental_output: Output.object({ schema: DiagnosisSchema }),
      prompt: `
You are analyzing why a specialist AI's weak-strong gap is below threshold.

Specialist: ${specialistId}
Current prompt: ${currentPrompt}

Evaluation results (${evalResults.length} tasks):
Avg weak score:   ${avgWeak.toFixed(2)} (target: ≤ 0.50)
Avg strong score: ${avgStrong.toFixed(2)} (target: ≥ 0.60)
Avg gap:          ${avgGap.toFixed(2)} (target: ≥ 0.25)

Failed tasks (weak scored too well):
${failedTasks
  .slice(0, 10)
  .map((t) => `  • "${t.taskDescription}" — weak=${t.weakScore.toFixed(2)}`)
  .join('\n')}

Recent trajectory patterns (approved):
${approvedPatterns.slice(-10).join('\n')}

Recent trajectory patterns (rejected):
${rejectedPatterns.slice(-10).join('\n')}

${emotionContext ? `${emotionContext}\n` : ''}
Diagnose the primary reason the gap is below threshold.
Provide a specific, actionable recommendation for what to change in the specialist prompt.
`,
    });

    const object = result.experimental_output;

    return {
      ...object,
      avgWeakScore: avgWeak,
      avgStrongScore: avgStrong,
      avgGap,
    };
  }

  private async loadTrajectories(tenantId: string): Promise<
    {
      summary: string;
      completed: boolean;
      emotionTag?: string;
      failureClass?: string;
    }[]
  > {
    try {
      const rows = await this.dataSource.query(
        `SELECT task_description AS summary, approved AS completed,
                emotion_tag AS "emotionTag", failure_class AS "failureClass"
         FROM task_trajectories
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 400`,
        [tenantId],
      );
      if (rows.length === 0) {
        this.logger.warn(
          `[EvolveAnalyzer] No trajectories for tenant ${tenantId} — diagnosis will have no trajectory patterns`,
        );
      }
      return rows.map((r: any) => ({
        summary: r.summary,
        completed: r.completed,
        emotionTag: r.emotionTag ?? undefined,
        failureClass: r.failureClass ?? undefined,
      }));
    } catch (err) {
      this.logger.error(
        `[EvolveAnalyzer] Failed to load trajectories for tenant ${tenantId}`,
        (err as Error).stack,
      );
      return [];
    }
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
