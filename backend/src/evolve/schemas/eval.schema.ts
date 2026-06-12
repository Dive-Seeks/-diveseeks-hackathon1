import { z } from 'zod';

export const EvalOutputSchema = z.object({
  answer: z.string(), // the model's solution
  confidence: z.number(), // self-assessed 0–1
  reasoning: z.string(), // how it got the answer
});

/**
 * Per-criterion rubric scoring (FB Autodata Pattern)
 * - Positive-only weights (no negatives — discovered via meta-optimization)
 * - Integer weights capped at 7 (prevents single criterion domination)
 * - Each criterion scored independently for both weak and strong
 */
export const RubricCriterionSchema = z.object({
  name: z.string(),
  description: z.string(),
  weight: z.number().int().min(1).max(7),
  weakScore: z.number().min(0).max(1),
  strongScore: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const JudgeOutputSchema = z.object({
  weakScore: z.number().min(0).max(10),
  strongScore: z.number().min(0).max(10),
  // Per-criterion rubric breakdown (FB Autodata pattern)
  criteria: z.array(RubricCriterionSchema).min(3).max(12),
  verdict: z.enum(['weak_higher', 'strong_higher', 'tied']),
  reasoning: z.string(),
  // New: which criteria show smallest gap (useful for evolve diagnosis)
  weakestCriteria: z.array(z.string()).max(3),
});

export type EvalOutput = z.infer<typeof EvalOutputSchema>;
export type JudgeOutput = z.infer<typeof JudgeOutputSchema>;
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
