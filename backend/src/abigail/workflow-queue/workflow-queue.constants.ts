import { TenantJobPayload } from '../../abigail-core/tenant-job.service';

export const AGENT_RUN_QUEUE = 'agent-run';
export const AGENT_SESSION_QUEUE = 'agent-session';

export const AGENT_RUN_JOB = 'run';
export const AGENT_SESSION_JOB = 'session';

/** Payload for one phased canvas run. taskIds are captured at prep time, in dispatch order. */
export interface AgentRunJobData extends TenantJobPayload {
  projectId: string;
  team: string;
  runId: string;
  taskIds: string[];
}

/** Payload for one autonomous session dispatch. */
export interface AgentSessionJobData extends TenantJobPayload {
  sessionId: string;
}

/** Thrown when the queue cannot accept a job (Redis down). Surfaced to the caller, never swallowed. */
export class QueueUnavailableError extends Error {
  constructor(message = 'workflow queue unavailable') {
    super(message);
    this.name = 'QueueUnavailableError';
  }
}

export const PROJECT_REPORT_QUEUE = 'project-report';
export const PROJECT_REPORT_JOB = 'compile';

export interface ProjectReportJobData extends TenantJobPayload {
  projectId: string;
  reportId: string;
}
