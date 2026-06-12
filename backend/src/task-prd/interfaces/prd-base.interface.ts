export type TeamName = 'coding' | 'general' | 'research' | string;

export type TaskPrdRequirementStatus =
  | 'pending'
  | 'pass'
  | 'fail'
  | 'human_pass'
  | 'skipped'
  | 'blocked';

export type TaskPrdFeatureMapStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'human_review';

export interface PrdRequirement {
  id: string; // hierarchical e.g. "1.1.1"
  text: string;
  flags: Record<string, unknown>; // union of team-specific flag types
}

export interface PrdFeature {
  id: string; // e.g. "1.1"
  title: string;
  requirements: PrdRequirement[];
}

export interface PrdContext {
  featureMapId: string;
  pendingRequirements: PrdRequirement[];
  previousIterationEvidence: Record<
    string,
    {
      satisfied: boolean;
      evidence: unknown;
      error?: string;
    }
  >;
  humanRejectionNotes: Array<{ requirementId: string; note: string }>;
}
