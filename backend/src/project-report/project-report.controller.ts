import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import {
  PROJECT_REPORT_QUEUE,
  PROJECT_REPORT_JOB,
  QueueUnavailableError,
} from '../abigail/workflow-queue/workflow-queue.constants';
import { ProjectReport } from './entities/project-report.entity';

const OD_INTERNAL_URL =
  process.env.OPEN_DESIGN_INTERNAL_URL ?? 'http://localhost:17573';
// No hardcoded fallback — secrets come from .env only (Rule 22). The previous
// fallback token is in git history and must be rotated.
const OD_API_TOKEN = process.env.OD_API_TOKEN ?? '';

@Controller('abigail')
@UseGuards(JwtAuthGuard)
export class ProjectReportController {
  private readonly logger = new Logger(ProjectReportController.name);

  constructor(
    @InjectQueue(PROJECT_REPORT_QUEUE) private readonly queue: Queue,
    @InjectRepository(ProjectReport)
    private readonly reportRepo: Repository<ProjectReport>,
    private readonly cls: TenantClsService,
  ) {}

  @Post('compile-report/:projectId')
  async compileReport(@Param('projectId') projectId: string) {
    const tenantId = this.cls.getTenantId()!;
    const userId = this.cls.getUserId() ?? tenantId;
    const reportId = uuidv4();

    const report = this.reportRepo.create({
      id: reportId,
      tenantId,
      projectId,
      status: 'pending',
    });
    await this.reportRepo.save(report);

    try {
      await this.queue.add(
        PROJECT_REPORT_JOB,
        { tenantId, userId, projectId, reportId },
        { jobId: reportId, removeOnComplete: true, removeOnFail: false },
      );
    } catch (err) {
      await this.reportRepo.update(reportId, {
        status: 'failed',
        errorMessage: 'queue_unavailable',
      });
      throw new QueueUnavailableError();
    }

    return { data: { reportId } };
  }

  @Get('report-status/:projectId')
  async getReportStatus(@Param('projectId') projectId: string) {
    const tenantId = this.cls.getTenantId()!;
    const report = await this.reportRepo.findOne({
      where: { tenantId, projectId },
      order: { createdAt: 'DESC' },
      select: ['id', 'status', 'createdAt'],
    });
    return {
      data: report ? { reportId: report.id, status: report.status } : null,
    };
  }

  @Get('report-clipboard/:reportId')
  async getReportClipboard(@Param('reportId') reportId: string) {
    const tenantId = this.cls.getTenantId()!;
    const report = await this.reportRepo.findOne({
      where: { id: reportId, tenantId },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return {
      data: {
        markdown: report.reportMarkdown ?? '',
        tsvData: report.tsvData ?? '',
        status: report.status,
      },
    };
  }

  @Post('design-project/:reportId')
  async createDesignProject(@Param('reportId') reportId: string) {
    const tenantId = this.cls.getTenantId()!;
    const report = await this.reportRepo.findOne({
      where: { id: reportId, tenantId },
      select: ['id', 'projectId', 'reportMarkdown', 'status'],
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const markdown = report.reportMarkdown ?? '';
    // Keep prompt under 4000 chars to avoid overwhelming the OD initial message
    const pendingPrompt =
      markdown.length > 4000
        ? markdown.slice(0, 4000) +
          '\n\n[...truncated — full report available in clipboard]'
        : markdown;

    const odProjectId = `report-${reportId.slice(0, 8)}`;

    try {
      const res = await fetch(`${OD_INTERNAL_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OD_API_TOKEN}`,
        },
        body: JSON.stringify({
          id: odProjectId,
          name: `Dive Report — ${new Date().toLocaleDateString()}`,
          pendingPrompt,
          skipDiscoveryBrief: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        // Duplicate project (SQLite UNIQUE constraint) → project already exists, fine
        const isDuplicate =
          body.includes('UNIQUE constraint') || res.status === 409;
        if (!isDuplicate) {
          this.logger.warn(
            `Open-Design project create failed: ${res.status} ${body}`,
          );
          throw new InternalServerErrorException(
            'Failed to create Open-Design project',
          );
        }
      }
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.warn(`Open-Design unreachable: ${err}`);
      throw new InternalServerErrorException('Open-Design is not reachable');
    }

    return { odProjectId };
  }
}
