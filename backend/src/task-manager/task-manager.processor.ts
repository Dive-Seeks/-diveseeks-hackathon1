import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TASK_MANAGER_QUEUE, TaskManagerJobs } from './task-manager.queue';
import { TaskManagerService } from './services/task-manager.service';

@Processor(TASK_MANAGER_QUEUE)
export class TaskManagerProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskManagerProcessor.name);

  constructor(private readonly taskManager: TaskManagerService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    switch (job.name) {
      case TaskManagerJobs.EXECUTE_TASK:
        return this.handleExecuteTask(job.data.taskId);
      case TaskManagerJobs.CHECK_READY:
        return this.taskManager.checkAndEnqueueReady(
          job.data.tenantId,
          job.data.workflowExecutionId,
        );
      default:
        this.logger.warn(`Unknown task-manager job: ${job.name}`);
    }
  }

  private async handleExecuteTask(taskId: string): Promise<void> {
    const attempt = await this.taskManager.startAttempt(taskId);
    const startTime = Date.now();

    try {
      this.logger.log(
        `Executing task ${taskId} (attempt ${attempt.attemptNumber})`,
      );
      // Actual execution is handled by the owning service (workflow-engine, audit-loop, etc.)
      // This processor marks the task as running; the specialist/workflow picks it up via polling or WS event
      // For now, tasks that reach RUNNING are expected to be completed externally via markComplete()
    } catch (error) {
      await this.taskManager.markFailed(taskId, error.message);
    }
  }
}
