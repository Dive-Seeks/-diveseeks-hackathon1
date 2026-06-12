import { SpecialistId } from '../entities/task-session.entity';

export interface ReasoningInput {
  message: string;
  visionSummary: string;
  injectedWeights: string[]; // from parametric weights Step 3B
  projectId: string;
  tenantId: string;
  userId: string;
}

export interface ThoughtStep {
  step: number;
  thought: string;
}

export interface CaiBlockReason {
  injectorId: string; // e.g. 'CAI-010'
  enforcement: 'HARD_BLOCK' | 'AUTO_REDIRECT' | 'CONFIDENCE_GATE';
  message: string;
}

export interface ReasoningResult {
  primarySpecialist: SpecialistId;
  alsoSpecialist: SpecialistId | null;
  subTasks: string[]; // decomposed sub-tasks (1–3 items)
  confidence: number; // 0.0–1.0
  usedReasoning: boolean; // false = keyword fallback
  reasoningTrace: ThoughtStep[]; // audit trail
  caiFlags: string[]; // any CAI rules that fired
  blockedBy?: CaiBlockReason; // set if CAI hard-blocked
}

export interface CaiEvaluationResult {
  hardBlocked: boolean;
  blockReason?: CaiBlockReason;
  activeFlags: string[];
}

export const SAFE_PAIRS: Record<string, SpecialistId | null> = {
  rex: 'kai',
  nova: 'kai',
  sage: 'pixel',
  luma: 'kai',
  felix: 'vex',
  kai: null,
  atlas: null,
  orion: null,
  pixel: null,
  vex: null,
};
