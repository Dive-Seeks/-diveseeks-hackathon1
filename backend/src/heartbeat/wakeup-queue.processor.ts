import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { AgentWakeupQueue } from '../common/entities/agent-wakeup-queue.entity';
import { TenantAwareProcessor } from '../abigail-core/tenant-aware.processor';

@Processor('wakeup-queue')
export class WakeupQueueProcessor extends TenantAwareProcessor {
  private readonly logger = new Logger(WakeupQueueProcessor.name);

  constructor(
    cls: ClsService,
    @InjectRepository(AgentWakeupQueue)
    private readonly wakeupRepo: Repository<AgentWakeupQueue>,
  ) {
    super(cls);
  }

  async handleJob(job: Job, token?: string): Promise<void> {
    const { wakeupId } = job.data;

    const wakeup = await this.wakeupRepo.findOne({ where: { id: wakeupId } });
    if (!wakeup || wakeup.status !== 'pending') {
      this.logger.debug(
        `Skipping wakeup ${wakeupId} — status: ${wakeup?.status}`,
      );
      return;
    }

    // Apply concurrency policy
    if (wakeup.concurrencyPolicy === 'skip_if_active') {
      const active = await this.wakeupRepo.findOne({
        where: {
          assigneeAgentId: wakeup.assigneeAgentId,
          status: 'picked_up',
        },
      });
      if (active) {
        this.logger.debug(
          `skip_if_active: agent ${wakeup.assigneeAgentId} already active`,
        );
        wakeup.status = 'skipped';
        await this.wakeupRepo.save(wakeup);
        return;
      }
    }

    wakeup.status = 'picked_up';
    wakeup.pickedUpAt = new Date();
    await this.wakeupRepo.save(wakeup);

    // Heartbeat dispatch is triggered by the calling service (Abigail or NightTeam)
    // that enqueued this wakeup — they listen for picked_up events
    this.logger.log(
      `Wakeup picked up: agent ${wakeup.assigneeAgentId}, domain ${wakeup.domain}`,
    );
  }
}
