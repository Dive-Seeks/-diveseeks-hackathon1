import {
  AgentRunJobData,
  AgentSessionJobData,
} from './workflow-queue.constants';

export const WORKFLOW_ORCHESTRATOR = Symbol('WORKFLOW_ORCHESTRATOR');

/**
 * Abstraction over the durable execution backend. Phase 1 = BullMqOrchestrator.
 * Phase 2 adds AdkOrchestrator and swaps the binding behind this token.
 */
export interface WorkflowOrchestrator {
  /** Enqueue a phased canvas run. Returns the runId (= jobId). Throws QueueUnavailableError on Redis failure. */
  startRun(data: AgentRunJobData): Promise<string>;
  /** Enqueue a single autonomous session dispatch. Throws QueueUnavailableError on Redis failure. */
  startSession(data: AgentSessionJobData): Promise<void>;
}
