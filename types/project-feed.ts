export interface ProjectFeedMessage {
  id: string;
  tenantId: string;
  projectId: string;
  type: 'vision_ready' | 'task_complete' | 'audit_complete';
  specialist?: string;
  outcome?: string;
  content: string;
  refId?: string;
  createdAt: string;
}

export interface TaskProgressEvent {
  sessionId: string;
  tenantId: string;
  userId: string;
  step: string;
  stepIndex: number;
  totalSteps: number;
  agentName: string;
  status: 'running' | 'done' | 'failed' | 'queued';
  message?: string;
}

export interface CanvasTask {
  id: string;
  title: string;
  description: string;
  specialist: string;
  alsoSpecialist?: string;
  priority: number;
  status: 'queued' | 'in_progress' | 'done' | 'blocked';
  sessionId?: string;
  source: 'tce' | 'user';
  createdAt: string;
}

export interface GoalWithTasks {
  goalId: string;
  goalTitle: string;
  goalStatus: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  tasks: CanvasTask[];
}
