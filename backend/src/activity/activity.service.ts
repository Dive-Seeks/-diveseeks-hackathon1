import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  /** Append-only write — never update, never delete */
  async log(entry: {
    tenantId?: string;
    issueId?: string;
    agentId?: string;
    actor: string;
    action: string;
    payload?: Record<string, any>;
  }): Promise<ActivityLog> {
    const record = this.activityRepo.create(entry);
    return this.activityRepo.save(record);
  }

  async findByTenant(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return { data, total };
  }

  async findByAgent(
    agentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { agentId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
    });
    return { data, total };
  }

  async findByIssue(issueId: string): Promise<ActivityLog[]> {
    return this.activityRepo.find({
      where: { issueId },
      order: { createdAt: 'ASC' },
    });
  }
}
