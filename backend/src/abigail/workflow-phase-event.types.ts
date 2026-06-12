export type WorkflowPhaseEvent =
  | {
      phase: 'ceo_speaking';
      ceoPlan: string;
      docsCount: number;
      jobsCount: number;
    }
  | { phase: 'coordinator_reading' }
  | {
      phase: 'agent_assigned';
      specialist: string;
      taskTitle: string;
      position: number;
      total: number;
    }
  | {
      phase: 'agent_complete';
      specialist: string;
      position: number;
      outcome: 'done' | 'needs_review' | 'blocked';
      summary: string;
      docSection: string;
      /** Which executor ran the task ('local' | 'adk' | 'hermes'), when recorded. */
      executorBackend?: string;
    }
  | {
      phase: 'workflow_done';
      reportSection: string;
      completedCount: number;
      needsReviewCount: number;
      blockedCount: number;
      totalCount: number;
    }
  | {
      phase: 'workflow_recovery_started';
      reason: string;
      action: string;
      unresolvedCount: number;
    }
  | {
      phase: 'workflow_recovery_completed';
      reason: string;
      action: string;
      unresolvedCount: number;
      manualReviewRequired: boolean;
    }
  | { phase: 'workflow_paused' }
  | { phase: 'workflow_resumed' }
  | { phase: 'workflow_resumed_after_interrupt' }
  | { phase: 'report_ready'; reportId: string; projectId: string }
  | { phase: 'report_failed'; reportId: string };
