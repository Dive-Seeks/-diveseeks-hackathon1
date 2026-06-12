import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DreamerConfig } from './entities/dreamer-config.entity';

// Simple cron validation — 5 fields (min hr dom mon dow), each valid range
const CRON_REGEX =
  /^(\*|([0-5]?\d))\s+(\*|(1?[0-9]|2[0-3]))\s+(\*|([1-9]|[12]\d|3[01]))\s+(\*|([1-9]|1[0-2]))\s+(\*|[0-6])$/;

@Injectable()
export class DreamerScheduleService implements OnModuleInit {
  private readonly logger = new Logger(DreamerScheduleService.name);

  constructor(
    @InjectRepository(DreamerConfig)
    private readonly configRepo: Repository<DreamerConfig>,
    @InjectQueue('dreamer')
    private readonly dreamerQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    // Re-register all tenant schedules on boot
    const configs = await this.configRepo.find({ where: { enabled: true } });
    for (const config of configs) {
      await this.registerJob(config.tenantId, config.cronExpression).catch(
        (err) =>
          this.logger.warn(
            `[DreamerSchedule] Failed to re-register tenant ${config.tenantId}: ${(err as Error).message}`,
          ),
      );
    }
    this.logger.log(
      `[DreamerSchedule] Re-registered ${configs.length} tenant schedules`,
    );
  }

  async updateSchedule(
    tenantId: string,
    cronExpression: string,
    enabled: boolean,
  ): Promise<void> {
    if (!this.isValidCron(cronExpression)) {
      throw new BadRequestException(
        `Invalid cron expression: "${cronExpression}". Use format "MM HH * * *" (e.g. "30 2 * * *")`,
      );
    }

    // Cancel any existing job for this tenant
    await this.removeJob(tenantId);

    // Upsert config
    await this.configRepo.upsert(
      { tenantId, cronExpression, enabled },
      { conflictPaths: ['tenantId'] },
    );

    if (enabled) {
      await this.registerJob(tenantId, cronExpression);
      this.logger.log(
        `[DreamerSchedule] Registered dreamer for tenant ${tenantId} at "${cronExpression}"`,
      );
    } else {
      this.logger.log(
        `[DreamerSchedule] Dreamer disabled for tenant ${tenantId}`,
      );
    }
  }

  private async registerJob(
    tenantId: string,
    cronExpression: string,
  ): Promise<void> {
    await this.dreamerQueue.add(
      'dream',
      { tenantId },
      {
        jobId: `dreamer:${tenantId}`,
        repeat: { pattern: cronExpression },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
  }

  private async removeJob(tenantId: string): Promise<void> {
    try {
      const jobs = await this.dreamerQueue.getRepeatableJobs();
      const existing = jobs.find((j) => j.key?.includes(`dreamer:${tenantId}`));
      if (existing) {
        await this.dreamerQueue.removeRepeatableByKey(existing.key);
      }
    } catch (err) {
      this.logger.warn(
        `[DreamerSchedule] removeJob failed for ${tenantId}: ${(err as Error).message}`,
      );
    }
  }

  private isValidCron(expr: string): boolean {
    return CRON_REGEX.test(expr.trim());
  }
}
