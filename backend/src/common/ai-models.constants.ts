/**
 * Centralized AI task identifiers.
 *
 * Concrete provider/model selection is the responsibility of
 * `AiProviderRouter` — services must not hardcode model strings.
 *
 * Why: the platform standardised on Google + DeepSeek (see migration commit
 * 45e620a); leaking provider-specific IDs into business code re-creates the
 * coupling we just removed.
 */
export const AI_TASKS = {
  SPECIALIST: 'specialist',
  FAST: 'chat',
  COMPACTION: 'compaction',
  SYNTHESIS: 'synthesis',
  PROMOTION: 'promotion',
  RESEARCHER: 'researcher',
} as const;

export type AiTask = (typeof AI_TASKS)[keyof typeof AI_TASKS];

/**
 * Evolve and Hermes still address concrete models — they intentionally pick
 * weak vs strong solvers for evaluation. Route through `AiProviderRouter` if
 * you need the abstraction; keep these only for the evaluation harnesses.
 */
export const EVOLVE_MODELS = {
  WEAK_SOLVER: 'gemini-2.5-flash',
  STRONG_SOLVER: 'gemini-2.5-pro',
  JUDGE: 'gemini-2.5-flash',
  ANALYZER: 'gemini-2.5-pro',
  IMPLEMENTER: 'gemini-2.5-pro',
} as const;

export const HERMES_MODELS = {
  CLASSIFIER: 'gemini-2.0-flash-lite',
} as const;
