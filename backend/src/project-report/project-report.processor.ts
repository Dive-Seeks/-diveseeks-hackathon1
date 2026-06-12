import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ClsService } from 'nestjs-cls';
import { generateText } from 'ai';
import { TenantAwareProcessor } from '../abigail-core/tenant-aware.processor';
import {
  PROJECT_REPORT_QUEUE,
  PROJECT_REPORT_JOB,
  ProjectReportJobData,
} from '../abigail/workflow-queue/workflow-queue.constants';
import { ProjectReport } from './entities/project-report.entity';
import { ProjectReportAssemblerService } from './project-report-assembler.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { GENERAL_SPECIALIST_PROMPTS } from '../abigail/specialists/general/general-specialist-prompts';

export { PROJECT_REPORT_JOB };

@Processor(PROJECT_REPORT_QUEUE)
export class ProjectReportProcessor extends TenantAwareProcessor {
  private readonly logger = new Logger(ProjectReportProcessor.name);

  constructor(
    cls: ClsService,
    @InjectRepository(ProjectReport)
    private readonly reportRepo: Repository<ProjectReport>,
    private readonly assembler: ProjectReportAssemblerService,
    private readonly gateway: SalesGateway,
    private readonly aiRouter: AiProviderRouter,
  ) {
    super(cls);
  }

  async handleJob(job: Job<ProjectReportJobData>): Promise<void> {
    const { tenantId, projectId, reportId } = job.data;

    await this.reportRepo.update(reportId, { status: 'generating' });

    try {
      const { markdown: bundle, tsv } = await this.assembler.buildBundle(
        tenantId!,
        projectId,
      );

      const model = this.aiRouter.getModel('researcher');
      const synthesisPrompt = GENERAL_SPECIALIST_PROMPTS['echo_synthesis'];
      const res = await generateText({
        model: model as any,
        messages: [
          { role: 'system', content: synthesisPrompt },
          {
            role: 'user',
            content: `Here is the full project data bundle:\n\n${bundle}`,
          },
        ],
      });

      await this.reportRepo.update(reportId, {
        reportMarkdown: res.text,
        tsvData: tsv,
        status: 'ready',
      });

      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'report_ready',
        reportId,
        projectId,
      });

      this.logger.log(`[ProjectReport] ready: ${reportId}`);
    } catch (err) {
      await this.reportRepo.update(reportId, {
        status: 'failed',
        errorMessage: (err as Error).message,
      });
      throw err;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProjectReportJobData>, error: Error) {
    this.logger.error(
      `[ProjectReport] job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
    this.gateway.emitWorkflowPhase(job.data.projectId, {
      phase: 'report_failed',
      reportId: job.data.reportId,
    });
  }
}
