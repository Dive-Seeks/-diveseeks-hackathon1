/**
 * Single source of truth for workflow status strings.
 * These values are persisted to the database — do NOT rename values.
 * Add new values via migration only.
 */

/** Status of a single specialist execution session (task_sessions table). */
export type TaskSessionStatus =
  | 'pending' // created, not yet picked up by a worker
  | 'running' // worker is actively executing
  | 'review' // specialist completed, awaiting human review
  | 'done' // successfully completed
  | 'failed' // terminal failure
  | 'needs_human' // human-in-the-loop approval required
  | 'orphaned'; // process died mid-execution; eligible for recovery

/** Status of a single TCE task (tce_tasks table). */
export type TceTaskStatus =
  | 'queued' // ready to be dispatched
  | 'in_progress' // being worked on
  | 'done' // complete
  | 'blocked' // blocked by error or dependency
  | 'needs_review'; // self-healing: task completed but PRD loop found 0/N requirements

/** Project-level lifecycle status (diveseeks_projects.lifecycle_status column). */
export type ProjectLifecycleStatus =
  | 'draft'
  | 'running'
  | 'updating'
  | 'waiting_for_agents'
  | 'paused'
  | 'cancelled'
  | 'blocked'
  | 'waiting_for_review'
  | 'waiting_for_user_approval'
  | 'completed'
  | 'ready';

/** Outcome reported by a specialist run (inside DisciplineReport). */
export type TaskOutcome = 'pass' | 'fail' | 'needs_review';

/**
 * Map a specialist TaskOutcome to the TaskSession status that should be persisted.
 * Single place for this derivation — used by DispatchEngineService and TaskOutcomeMapper.
 */
export function taskOutcomeToSessionStatus(
  outcome: TaskOutcome,
): Extract<TaskSessionStatus, 'done' | 'review' | 'failed'> {
  switch (outcome) {
    case 'pass':
      return 'done';
    case 'needs_review':
      return 'review';
    case 'fail':
    default:
      return 'failed';
  }
}

/**
 * Map a TaskSession terminal status to the TceTask status that should be written back.
 */
export function sessionStatusToTceStatus(
  sessionStatus: TaskSessionStatus,
): TceTaskStatus {
  switch (sessionStatus) {
    case 'done':
      return 'done';
    case 'review':
      return 'needs_review';
    case 'failed':
    case 'orphaned':
      return 'blocked';
    default:
      return 'blocked';
  }
}
