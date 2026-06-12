import { Injectable, Logger } from '@nestjs/common';
import { generateText, Output } from 'ai';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import {
  EvalOutputSchema,
  JudgeOutputSchema,
  EvalOutput,
  JudgeOutput,
} from './schemas/eval.schema';

export interface TaskInput {
  taskDescription: string;
  context: string; // vision summary + injected weights
  trajectoryId?: string; // back-reference to trajectory file
}

export interface EvalResult {
  taskDescription: string;
  trajectoryId?: string;
  weakScores: number[]; // raw scores from each weak run
  strongScores: number[]; // raw scores from each strong run
  judgeScores: number[]; // raw scores from each judge
  weakScore: number; // avg of weakScores, 0–1
  strongScore: number; // avg of strongScores, 0–1
  gap: number; // strongScore - weakScore
  passedCriterion: boolean; // weak≤0.50 AND strong≥0.60 AND gap≥0.25
}

@Injectable()
export class EvalHarnessService {
  private readonly logger = new Logger(EvalHarnessService.name);
  private readonly WEAK_RUNS = 5;
  private readonly STRONG_RUNS = 3;
  private readonly JUDGE_COUNT = 8;

  constructor(
    private readonly aiRouter: AiProviderRouter,
    private readonly tokenizerService: TokenizerService,
  ) {}

  async evalTask(
    task: string,
    context: string,
    specialistPrompt: string,
  ): Promise<EvalResult> {
    this.logger.log(`Evaluating task: ${task.substring(0, 50)}...`);

    // Weak runs — parallelized
    const weakPromises = Array(this.WEAK_RUNS)
      .fill(null)
      .map(() =>
        generateText({
          model: this.aiRouter.getEvolveModel('weak'),
          experimental_output: Output.object({ schema: EvalOutputSchema }),
          system: specialistPrompt,
          prompt: `Task: ${task}\nContext: ${context}`,
        }),
      );

    // Strong runs — parallelized
    const strongPromises = Array(this.STRONG_RUNS)
      .fill(null)
      .map(() =>
        generateText({
          model: this.aiRouter.getEvolveModel('strong'),
          experimental_output: Output.object({ schema: EvalOutputSchema }),
          system: specialistPrompt,
          prompt: `Task: ${task}\nContext: ${context}`,
        }),
      );

    const [weakResults, strongResults] = await Promise.all([
      Promise.all(weakPromises),
      Promise.all(strongPromises),
    ]);

    const weakOutputs = weakResults.map((r) => r.experimental_output);
    const strongOutputs = strongResults.map((r) => r.experimental_output);

    // Judge ensemble — scores BOTH outputs
    const judgePromises = Array(this.JUDGE_COUNT)
      .fill(null)
      .map(() =>
        generateText({
          model: this.aiRouter.getEvolveModel('judge'),
          experimental_output: Output.object({ schema: JudgeOutputSchema }),
          prompt: this.buildJudgePrompt(task, weakOutputs, strongOutputs),
        }),
      );

    const judgeResults = await Promise.all(judgePromises);
    const judgeOutputs = judgeResults.map((r) => r.experimental_output);

    const avgWeakScore = this.avg(judgeOutputs.map((j) => j.weakScore)) / 10;
    const avgStrongScore =
      this.avg(judgeOutputs.map((j) => j.strongScore)) / 10;
    const gap = avgStrongScore - avgWeakScore;

    return {
      taskDescription: task,
      weakScores: judgeOutputs.map((j) => j.weakScore / 10),
      strongScores: judgeOutputs.map((j) => j.strongScore / 10),
      judgeScores: judgeOutputs.map((j) => (j.strongScore - j.weakScore) / 10),
      weakScore: avgWeakScore,
      strongScore: avgStrongScore,
      gap,
      passedCriterion:
        avgWeakScore <= 0.5 && avgStrongScore >= 0.6 && gap >= 0.25,
    };
  }

  async evalBatch(
    tasks: TaskInput[],
    specialistPrompt: string,
    concurrency = 5,
  ): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    // Simple concurrency control
    for (let i = 0; i < tasks.length; i += concurrency) {
      const batch = tasks.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((t) =>
          this.evalTask(t.taskDescription, t.context, specialistPrompt),
        ),
      );
      results.push(...batchResults);
    }

    return results;
  }

  private buildJudgePrompt(
    task: string,
    weakOutputs: EvalOutput[],
    strongOutputs: EvalOutput[],
  ): string {
    const weakStrs = weakOutputs.map(
      (o, i) => `Run ${i + 1}:\nReasoning: ${o.reasoning}\nAnswer: ${o.answer}`,
    );
    const strongStrs = strongOutputs.map(
      (o, i) => `Run ${i + 1}:\nReasoning: ${o.reasoning}\nAnswer: ${o.answer}`,
    );

    const weakFitted = this.tokenizerService.fitToWindow(weakStrs, 3000);
    const strongFitted = this.tokenizerService.fitToWindow(strongStrs, 3000);

    const weakBlock = weakFitted.join('\n\n');
    const strongBlock = strongFitted.join('\n\n');

    if (
      weakFitted.length < weakStrs.length ||
      strongFitted.length < strongStrs.length
    ) {
      const totalTokens = this.tokenizerService.countTokens(
        weakBlock + strongBlock,
      );
      this.logger.warn(
        `[EvalHarness] Judge prompt truncated for task: "${task.substring(0, 60)}" — fitted to ${totalTokens} tokens`,
      );
    }

    return `
You are an expert judge for an AI coding specialist system.
Your task is to evaluate the quality of answers provided by two different groups of models (Weak and Strong) for the same task.

Task: ${task}

--- WEAK MODEL OUTPUTS ---
${weakBlock}

--- STRONG MODEL OUTPUTS ---
${strongBlock}

RUBRIC SCORING INSTRUCTIONS:
Score BOTH groups using a WEIGHTED RUBRIC with these criteria. Each criterion has a weight (1-7, higher = more important).
Use POSITIVE-ONLY weights — do NOT create negative criteria or penalty-based scoring.
Cap all weights at 7.

Required criteria (minimum 5):
1. Accuracy (weight: 7) — Does the answer correctly solve the task?
2. Security (weight: 6) — Are tenant_id isolation and access controls properly handled?
3. Code Quality (weight: 5) — Clean, maintainable, follows patterns?
4. Completeness (weight: 4) — Does the answer address all parts of the task?
5. Domain Knowledge (weight: 3) — Does the answer show understanding of the specific business domain?

You may add up to 7 additional criteria (task-specific, max weight 7 each).

For each criterion, score both weak (0.0-1.0) and strong (0.0-1.0) independently.
Also identify the TOP 3 criteria with the SMALLEST gap (strong - weak) — these are the "weakestCriteria" where the task is least discriminating.

Overall weakScore and strongScore should be the weighted average of criteria (0-10 scale).
`;
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
