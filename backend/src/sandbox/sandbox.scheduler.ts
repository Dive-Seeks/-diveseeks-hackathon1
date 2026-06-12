import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SandboxScheduler {
  private readonly logger = new Logger(SandboxScheduler.name);

  constructor(
    @InjectQueue('sandbox-cleanup')
    private readonly cleanupQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup() {
    this.logger.log('Adding sandbox cleanup job to queue...');
    await this.cleanupQueue.add(
      'cleanup',
      {},
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
