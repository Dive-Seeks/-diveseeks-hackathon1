export const TASK_MANAGER_QUEUE = 'task-manager';

export const TaskManagerJobs = {
  EXECUTE_TASK: 'execute-task',
  CHECK_READY: 'check-ready',
  RETRY_TASK: 'retry-task',
} as const;
