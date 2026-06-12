import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectTier } from './entities/project-tier.entity';
import { TaskSession } from '../entities/task-session.entity';
import { ProjectTierService } from './project-tier.service';

const WEEKLY_SESSION_THRESHOLD = 50;

@Injectable()
export class ProjectTierCron {
  private readonly logger = new Logger(ProjectTierCron.name);

  constructor(
    @InjectRepository(ProjectTier)
    private readonly tierRepo: Repository<ProjectTier>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    private readonly tierService: ProjectTierService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async checkAutoPromotions(): Promise<void> {
    this.logger.log('Running weekly tier auto-promotion check');
    const allTiers = await this.tierRepo.find();

    for (const record of allTiers) {
      if (record.tier === 'enterprise') continue;

      const sessionCount = await this.sessionRepo.count({
        where: { projectId: record.projectId, teamId: record.tenantId },
      });

      if (sessionCount >= WEEKLY_SESSION_THRESHOLD) {
        try {
          await this.tierService.promote(record.projectId, record.tenantId);
          this.logger.log(
            `Auto-promoted project ${record.projectId} from ${record.tier} (${sessionCount} sessions/week)`,
          );
        } catch (err) {
          this.logger.warn(
            `Auto-promotion failed for ${record.projectId}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}
