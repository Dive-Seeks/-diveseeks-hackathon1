import { TaskSession } from '../entities/task-session.entity';

export type ExecutorBackend = 'local' | 'adk' | 'hermes';

/** The minimal report shape the dispatch engine already consumes from a specialist run. */
export interface SpecialistRunReport {
  taskOutcome: 'pass' | 'fail' | 'needs_review';
  duration: number;
  errorPatterns: string[];
  /** Which executor actually ran the task — stamped by the leaf executor, surfaced in agent_complete. */
  executorBackend?: ExecutorBackend;
}

/** Result of running one specialist task — identical shape to `primaryAgent.execute()` today. */
export interface SpecialistRunResult {
  result: string;
  report: SpecialistRunReport;
}

/** Everything an executor needs to run one specialist task. */
export interface SpecialistRunInput {
  session: TaskSession;
  /** The id to run the specialist under (today: `ctx.session.id` for primary). */
  runSessionId: string;
  specialist: string;
  team: string;
  isCoding: boolean;
  userId: string;
  tenantId: string;
}

export interface SpecialistExecutor {
  /** Run one specialist task. MUST NOT throw for business failures — return a `fail` report instead. */
  run(input: SpecialistRunInput): Promise<SpecialistRunResult>;
}

export const SPECIALIST_EXECUTOR = Symbol('SPECIALIST_EXECUTOR');
