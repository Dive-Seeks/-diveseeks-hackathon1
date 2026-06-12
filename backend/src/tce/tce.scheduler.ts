import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TceService } from './tce.service';

@Injectable()
export class TceScheduler {
  private readonly logger = new Logger(TceScheduler.name);

  constructor(
    @Inject(forwardRef(() => TceService))
    private readonly tceService: TceService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleDailyScan() {
    this.logger.log('Starting daily TCE gap analysis...');
    const projects = await this.tceService.getActiveProjects();
    if (projects.length === 0) {
      this.logger.warn('No active projects — daily scan skipped.');
      return;
    }
    for (const project of projects) {
      this.logger.log(`Running gap analysis for project: ${project.id}`);
      await this.tceService.runGapAnalysis(project.id, project.teamId, 1.0);
    }
    this.logger.log(
      `Daily scan complete — ${projects.length} projects processed.`,
    );
  }

  async triggerOnGoalComplete(projectId: string) {
    this.logger.log(
      `Goal complete trigger for project ${projectId}. Running gap analysis.`,
    );
    const tenantId = await this.tceService.getProjectTenantId(projectId);
    await this.tceService.runGapAnalysis(projectId, tenantId, 1.0);
  }
}
