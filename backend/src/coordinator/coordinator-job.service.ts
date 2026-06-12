import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CoordinatorJob,
  CoordinatorJobKind,
  CoordinatorJobStatus,
} from './entities/coordinator-job.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { PromptResolverService } from '../prompt-engine/services/prompt-resolver.service';
import { PracticeReport } from './coordinator-security.service';

@Injectable()
export class CoordinatorJobService {
  private readonly logger = new Logger(CoordinatorJobService.name);

  constructor(
    @InjectRepository(CoordinatorJob)
    private readonly jobRepo: Repository<CoordinatorJob>,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    private readonly promptResolver: PromptResolverService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createJob(
    tenantId: string,
    kind: CoordinatorJobKind,
    data: Partial<CoordinatorJob>,
  ): Promise<CoordinatorJob> {
    const job = this.jobRepo.create({
      tenantId,
      kind,
      ...data,
    });
    return this.jobRepo.save(job);
  }

  async completeJob(jobId: string, output: string): Promise<void> {
    await this.jobRepo.update(jobId, {
      output,
      status: 'done',
      completedAt: new Date(),
    });
  }

  // Called by daily cron — reads new tce_tasks → creates plan jobs
  async createDailyPlans(tenantId: string): Promise<void> {
    const pendingTasks = await this.tceTaskRepo.find({
      where: { projectId: tenantId, status: 'queued' },
      order: { priority: 'DESC' },
      take: 5, // Coordinator creates at most 5 plans per day
    });

    for (const task of pendingTasks) {
      // Create a plan job record
      const job = await this.createJob(tenantId, 'plan', {
        subject: task.title,
        linkedEntityId: task.id,
        linkedEntityType: 'tce_task',
        status: 'running',
      });

      try {
        // Write a plan summary using PromptResolverService
        const planText = await this.buildPlan(task, tenantId);
        await this.completeJob(job.id, planText);

        // Emit event so frontend can show the plan
        this.eventEmitter.emit('coordinator:plan_created', {
          tenantId,
          jobId: job.id,
          taskId: task.id,
          planText,
        });
      } catch (error) {
        this.logger.error(
          `Failed to build plan for task ${task.id}: ${error.message}`,
        );
        await this.jobRepo.update(job.id, {
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }
  }

  // Called by main cycle after practice check passes
  async planAndAssign(
    tenantId: string,
    practiceReport: PracticeReport,
  ): Promise<void> {
    // Skip assignment if bad practices exceed threshold
    if (practiceReport.badPracticeCount > 3) {
      await this.createJob(tenantId, 'practice_check', {
        subject: 'Too many bad practices — assignment suspended',
        findings: practiceReport as any,
        status: 'skipped',
      });
      return;
    }

    // Assign top-priority pending plan jobs to specialists
    const plans = await this.jobRepo.find({
      where: { tenantId, kind: 'plan', status: 'done' },
      order: { createdAt: 'ASC' },
      take: 3,
    });

    for (const plan of plans) {
      const specialist = this.resolveSpecialist(plan.subject || '');

      // Check if already assigned
      const existingAssign = await this.jobRepo.findOne({
        where: {
          tenantId,
          kind: 'assign',
          linkedEntityId: plan.id,
          status: 'done',
        },
      });
      if (existingAssign) continue;

      await this.createJob(tenantId, 'assign', {
        subject: plan.subject,
        assignedSpecialist: specialist,
        linkedEntityId: plan.id,
        linkedEntityType: 'coordinator_job',
        status: 'done',
        toolPolicy: {
          allow: [
            'git_context',
            'code_search',
            'file_read',
            ...(specialist === 'atlas' || specialist === 'rex'
              ? ['sandbox_create', 'sandbox_exec', 'sandbox_close']
              : []),
          ],
          deny: ['browser', 'api_fusion_call', 'web_fetch', 'cron_create'],
        },
      });

      this.eventEmitter.emit('coordinator:job_assigned', {
        tenantId,
        specialist,
        subject: plan.subject,
        planJobId: plan.id,
      });
    }
  }

  private async buildPlan(task: TCETask, tenantId: string): Promise<string> {
    // role prompt: 'coordinator-planner'
    const prompt = await this.promptResolver.resolveForRole(
      'coordinator-planner',
      tenantId,
      {
        taskTitle: task.title,
        taskDescription: task.description,
        priority: task.priority,
      },
    );

    return prompt || `Plan for ${task.title}: Needs detailed investigation.`;
  }

  // resolveSpecialist: keyword-based routing (no LLM cost)
  private resolveSpecialist(subject: string): string {
    const sub = subject.toLowerCase();
    if (
      sub.includes('backend') ||
      sub.includes('api') ||
      sub.includes('endpoint') ||
      sub.includes('database')
    ) {
      return 'rex';
    }
    if (
      sub.includes('frontend') ||
      sub.includes('ui') ||
      sub.includes('component') ||
      sub.includes('page')
    ) {
      return 'nova';
    }
    if (
      sub.includes('test') ||
      sub.includes('spec') ||
      sub.includes('coverage')
    ) {
      return 'sage';
    }
    if (
      sub.includes('security') ||
      sub.includes('auth') ||
      sub.includes('owasp')
    ) {
      return 'felix';
    }
    if (
      sub.includes('deploy') ||
      sub.includes('docker') ||
      sub.includes('ci')
    ) {
      return 'atlas';
    }
    if (
      sub.includes('architecture') ||
      sub.includes('design') ||
      sub.includes('structure')
    ) {
      return 'orion';
    }
    return 'rex'; // default
  }
}
