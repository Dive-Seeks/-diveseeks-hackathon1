import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantAwareProcessor } from '../../abigail-core/tenant-aware.processor';
import { AbigailMindService } from '../abigail-mind.service';
import {
  AGENT_SESSION_QUEUE,
  AgentSessionJobData,
} from './workflow-queue.constants';

@Processor(AGENT_SESSION_QUEUE, { concurrency: 5 })
export class AgentSessionProcessor extends TenantAwareProcessor {
  private readonly logger = new Logger(AgentSessionProcessor.name);

  constructor(
    cls: ClsService,
    private readonly mind: AbigailMindService,
  ) {
    super(cls);
  }

  async handleJob(job: Job<AgentSessionJobData>): Promise<void> {
    this.logger.log(
      `[agent-session] dispatching session ${job.data.sessionId}`,
    );
    await this.mind.dispatch(job.data.sessionId);
  }
}
