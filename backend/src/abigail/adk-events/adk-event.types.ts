/** Emitted by the ADK root/sub agents over Pub/Sub. Mirrors workflow-phase-event.types.ts phases. */
export interface AdkPhaseEvent {
  projectId: string;
  tenantId: string;
  runId: string;
  phase:
    | 'coordinator_reading'
    | 'agent_assigned'
    | 'agent_complete'
    | 'workflow_done'
    | 'workflow_recovery_started'
    | 'workflow_recovery_completed'
    | 'workflow_paused'
    | 'workflow_resumed_after_interrupt';
  specialist?: string;
  taskTitle?: string;
  position?: number;
  total?: number;
  outcome?: string;
  summary?: string;
  docSection?: string;
  reportSection?: string;
  action?: string;
  reason?: string;
  unresolvedCount?: number;
  manualReviewRequired?: boolean;
}
