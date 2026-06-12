import { PrdRequirement, TeamName } from './prd-base.interface';

export interface EvaluationContext {
  session: {
    id: string;
    teamId: string;
    projectId: string;
    specialist: string;
    team: TeamName;
  };
  vision: {
    constraints: string[];
    techStack: { locked: string[]; forbidden: string[] };
  };
  sandbox: { id: string; rootPath: string } | null;
  previousEvidence: Record<string, unknown>;
}

export interface SpecialistOutput {
  artefacts: Array<{ path: string; content: string }>;
  reasoning: string;
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>;
  files: string[];
  messages: string[];
  rawOutput: string;
}

export interface EvaluationResult {
  satisfied: boolean;
  evidence: Record<string, unknown>;
  error?: string;
  requiresHumanApproval?: boolean;
  humanInstruction?: string;
}

export interface IEvidenceEvaluator {
  readonly evaluatorId: string;
  readonly supportedFlags: string[];
  readonly team: TeamName | 'all';
  readonly betweenIterationDelayMs: number;
  readonly description: string;

  evaluate(
    requirement: PrdRequirement,
    specialistOutput: SpecialistOutput,
    context: EvaluationContext,
  ): Promise<EvaluationResult>;
}
