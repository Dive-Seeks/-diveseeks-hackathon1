// backend/src/abigail/dispatch/pipeline-step.interface.ts

export type FailureMode = 'FAIL_FAST' | 'ESCALATE' | 'DEGRADE';

export interface RetryPolicy {
  maxRetries: number; // 0 = no retry
  backoffMs: number; // ms between attempts
}

export interface StepDef {
  key: string;
  group: string;
  parallel: boolean;
  retryPolicy: RetryPolicy;
  failureMode: FailureMode;
  checkpointAfter: boolean;
}

export interface GroupDef {
  key: string;
  steps: StepDef[];
}

export interface StepContext {
  session: import('../entities/task-session.entity').TaskSession;
  // populated as groups complete
  vision?: any;
  gitContext?: string;
  companyKnowledge?: string;
  chatHistory?: string;
  skillsContext?: string;
  pluginsContext?: string;
  specKitContext?: string;
  coordinator?: any;
  goalAncestry?: any;
  prdContext?: any;
  primaryResult?: { result: string; report: any };
  secondaryResult?: { result: string; report: any } | null;
  degradedSteps: string[];
}

export interface StepResult {
  success: boolean;
  output?: Partial<StepContext>;
  error?: Error;
  durationMs: number;
}

export class EscalationError extends Error {
  constructor(public readonly stepKey: string) {
    super(`Step ${stepKey} escalated to human review`);
  }
}

export class FastFailError extends Error {
  constructor(
    public readonly stepKey: string,
    message: string,
  ) {
    super(`Step ${stepKey} fast-failed: ${message}`);
  }
}
