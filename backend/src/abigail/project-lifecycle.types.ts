export type ProjectLifecycleStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'paused'
  | 'waiting_for_agents'
  | 'waiting_for_review'
  | 'updating'
  | 'waiting_for_user_approval'
  | 'completed'
  | 'blocked'
  | 'cancelled';

export type ProjectChatIntent =
  | 'run'
  | 'update'
  | 'approve'
  | 'complete'
  | 'cancel'
  | 'question'
  | 'normal';

export interface ProjectUpdateRequest {
  id: string;
  messageId?: string;
  requestedBy: 'user' | 'agent';
  text: string;
  status: 'open' | 'assigned' | 'applied' | 'needs_clarification' | 'cancelled';
  target: 'vision' | 'tasks' | 'documents' | 'final_summary' | 'unknown';
  affectedTaskIds: string[];
  affectedDocumentPaths: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface ProjectCompletionChecklist {
  allTasksTerminal: boolean;
  noBlockedTasks: boolean;
  allGoalsComplete: boolean;
  requiredDocsPresent: boolean;
  coordinatorReviewed: boolean;
  finalSummaryReady: boolean;
  userApprovalRequired: boolean;
  memoryEpisodeWritten: boolean;
}

export interface ProjectCompletionCard {
  projectId: string;
  tenantId: string;
  status: ProjectLifecycleStatus;
  summary: string;
  originalRequest: string | null;
  currentUserAsk: string | null;
  goals: Array<{
    id: string;
    title: string;
    status: string;
    progress?: number;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    specialist: string;
    status: string;
    sessionId: string | null;
  }>;
  activeSessions: Array<{ id: string; specialist: string; status: string }>;
  documents: Array<{
    path: string;
    title: string;
    kind: 'spec' | 'plan' | 'tasks' | 'artifact' | 'unknown';
  }>;
  updateRequests: ProjectUpdateRequest[];
  checklist: ProjectCompletionChecklist;
  nextAction:
    | 'run_agents'
    | 'review_outputs'
    | 'ask_user'
    | 'apply_update'
    | 'mark_complete'
    | 'blocked';
  lastActivityAt: string | null;
}
