import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WorkflowOrchestrator } from './workflow-orchestrator.interface';
import {
  AGENT_RUN_QUEUE,
  AGENT_SESSION_QUEUE,
  AGENT_RUN_JOB,
  AGENT_SESSION_JOB,
  AgentRunJobData,
  AgentSessionJobData,
  QueueUnavailableError,
} from './workflow-queue.constants';

const RETRY_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

@Injectable()
export class BullMqOrchestrator implements WorkflowOrchestrator {
  private readonly logger = new Logger(BullMqOrchestrator.name);

  constructor(
    @InjectQueue(AGENT_RUN_QUEUE) private readonly runQueue: Queue,
    @InjectQueue(AGENT_SESSION_QUEUE) private readonly sessionQueue: Queue,
  ) {}

  async startRun(data: AgentRunJobData): Promise<string> {
    try {
      await this.runQueue.add(AGENT_RUN_JOB, data, {
        ...RETRY_OPTS,
        jobId: data.runId,
      });
      return data.runId;
    } catch (err) {
      this.logger.error(
        `[WorkflowQueue] startRun failed: ${(err as Error).message}`,
      );
      throw new QueueUnavailableError();
    }
  }

  async startSession(data: AgentSessionJobData): Promise<void> {
    try {
      await this.sessionQueue.add(AGENT_SESSION_JOB, data, RETRY_OPTS);
    } catch (err) {
      this.logger.error(
        `[WorkflowQueue] startSession failed: ${(err as Error).message}`,
      );
      throw new QueueUnavailableError();
    }
  }
}
