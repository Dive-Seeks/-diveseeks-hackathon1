import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, LessThan } from 'typeorm';
import { AgentIssue } from '../issues/entities/agent-issue.entity';

@Injectable()
export class LivenessService {
  private readonly logger = new Logger(LivenessService.name);
  private readonly STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
  ) {}

  @Cron('*/30 * * * * *')
  async recoverStaleRuns(): Promise<void> {
    const staleThreshold = new Date(Date.now() - this.STALE_THRESHOLD_MS);

    const staleIssues = await this.issueRepo.find({
      where: {
        status: 'in_progress',
        executionLockedAt: LessThan(staleThreshold),
      },
    });

    for (const issue of staleIssues) {
      this.logger.warn(
        `Recovering stale issue: ${issue.id} locked at ${issue.executionLockedAt}`,
      );
      issue.status = 'assigned';
      issue.executionLockedAt = null;
      issue.checkoutRunId = null;
      await this.issueRepo.save(issue);
    }

    if (staleIssues.length > 0) {
      this.logger.log(`Liveness recovered ${staleIssues.length} stale issues`);
    }

    // Also recover issues stuck in_progress with null executionLockedAt
    // (released by old code path that did not reset status).
    const nullLockStuck = await this.issueRepo.find({
      where: {
        status: 'in_progress',
        executionLockedAt: IsNull(),
      },
    });
    for (const issue of nullLockStuck) {
      this.logger.warn(`Recovering null-lock stuck issue: ${issue.id}`);
      issue.status = 'assigned';
      await this.issueRepo.save(issue);
    }
    if (nullLockStuck.length > 0) {
      this.logger.log(
        `Liveness recovered ${nullLockStuck.length} null-lock stuck issues`,
      );
    }
  }
}
