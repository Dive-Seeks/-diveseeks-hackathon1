import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';
import { ProjectFeedService } from '../project-feed/project-feed.service';
import { ProjectCardService } from './project-card.service';
import { ProjectMemoryService } from './project-memory.service';
import type {
  ProjectCompletionCard,
  ProjectUpdateRequest,
} from './project-lifecycle.types';
import { randomUUID } from 'crypto';

const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

@Injectable()
export class ProjectLifecycleService {
  private readonly logger = new Logger(ProjectLifecycleService.name);

  constructor(
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    private readonly feedService: ProjectFeedService,
    private readonly cardService: ProjectCardService,
    private readonly memoryService: ProjectMemoryService,
  ) {}

  @OnEvent('project_goals_completed')
  async handleProjectGoalsCompleted(payload: {
    projectId: string;
    tenantId: string;
  }) {
    await this.refreshStatus(payload.tenantId, payload.projectId);
  }

  async processUserIntent(
    projectId: string,
    tenantId: string,
    intentResult: any,
  ): Promise<void> {
    if (intentResult.intent === 'completion_request') {
      await this.approveCompletion(tenantId, projectId);
    } else if (intentResult.intent === 'update_request') {
      await this.recordUpdateRequest(tenantId, projectId, intentResult.context);
    }
  }

  async startRun(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectCompletionCard> {
    const project = await this.findProject(tenantId, projectId);
    if (!project || TERMINAL_STATUSES.has(project.lifecycleStatus)) {
      return this.cardService.build(tenantId, projectId);
    }
    if (
      project.lifecycleStatus === 'running' ||
      project.lifecycleStatus === 'waiting_for_agents'
    ) {
      return this.cardService.build(tenantId, projectId);
    }
    await this.projectRepo.update(projectId, { lifecycleStatus: 'running' });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_started',
      'Workflow run started.',
    );
    this.logger.log(`[lifecycle] ${projectId} → running`);
    return this.cardService.build(tenantId, projectId);
  }

  async markWaitingForAgents(
    tenantId: string,
    projectId: string,
  ): Promise<void> {
    await this.projectRepo.update(projectId, {
      lifecycleStatus: 'waiting_for_agents',
    });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_updated',
      'Agents are working on your project.',
    );
  }

  async pauseRun(tenantId: string, projectId: string): Promise<void> {
    await this.projectRepo.update(projectId, { lifecycleStatus: 'paused' });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_updated',
      'Workflow run paused.',
    );
    this.logger.log(`[lifecycle] ${projectId} → paused`);
  }

  async resumeRun(tenantId: string, projectId: string): Promise<void> {
    await this.projectRepo.update(projectId, { lifecycleStatus: 'running' });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_updated',
      'Workflow run resumed.',
    );
    this.logger.log(`[lifecycle] ${projectId} → running (resumed)`);
  }

  async cancelRun(tenantId: string, projectId: string): Promise<void> {
    await this.projectRepo.update(projectId, { lifecycleStatus: 'cancelled' });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_updated',
      'Workflow run ended.',
    );
    this.logger.log(`[lifecycle] ${projectId} → cancelled`);
  }

  /**
   * A run finished or was ended by the user — return the project to idle (re-runnable).
   * Only transitions an active run (running|paused); never overrides a terminal
   * (completed/cancelled) or review state. This is run-level, not project-level cancel:
   * the project stays runnable so canvas-run's startRun guard does not block the next run.
   */
  async finishRun(tenantId: string, projectId: string): Promise<void> {
    const project = await this.findProject(tenantId, projectId);
    if (!project) return;
    if (
      project.lifecycleStatus === 'running' ||
      project.lifecycleStatus === 'paused'
    ) {
      await this.projectRepo.update(projectId, { lifecycleStatus: 'ready' });
      await this.feedService.addLifecycleEvent(
        tenantId,
        projectId,
        'lifecycle_updated',
        'Workflow run finished.',
      );
      this.logger.log(`[lifecycle] ${projectId} → ready (run finished)`);
    }
  }

  async recordUpdateRequest(
    tenantId: string,
    projectId: string,
    text: string,
    messageId?: string,
  ): Promise<ProjectCompletionCard> {
    const project = await this.findProject(tenantId, projectId);
    if (!project || TERMINAL_STATUSES.has(project.lifecycleStatus)) {
      return this.cardService.build(tenantId, projectId);
    }
    const existing: ProjectUpdateRequest[] =
      (project.updateRequests as ProjectUpdateRequest[]) ?? [];
    const request: ProjectUpdateRequest = {
      id: randomUUID(),
      messageId,
      requestedBy: 'user',
      text,
      status: 'open',
      target: 'unknown',
      affectedTaskIds: [],
      affectedDocumentPaths: [],
      createdAt: new Date().toISOString(),
    };
    await this.projectRepo.update(projectId, {
      lifecycleStatus: 'updating',
      updateRequests: [...existing, request],
    });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'update_requested',
      `Update requested: ${text.slice(0, 80)}`,
    );
    return this.cardService.build(tenantId, projectId);
  }

  async requestCompletionReview(
    tenantId: string,
    projectId: string,
    summary?: string,
  ): Promise<ProjectCompletionCard> {
    const project = await this.findProject(tenantId, projectId);
    if (!project || TERMINAL_STATUSES.has(project.lifecycleStatus)) {
      return this.cardService.build(tenantId, projectId);
    }
    const stored = project.completionChecklist ?? {};
    await this.projectRepo.update(projectId, {
      lifecycleStatus: 'waiting_for_user_approval',
      completionSummary: summary ?? project.completionSummary,
      completionChecklist: { ...stored, coordinatorReviewed: true },
    });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'completion_review',
      summary ?? 'Project review complete — awaiting your approval.',
    );
    return this.cardService.build(tenantId, projectId);
  }

  async approveCompletion(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectCompletionCard> {
    const card = await this.cardService.build(tenantId, projectId);
    const { checklist } = card;
    const blocking = Object.entries(checklist)
      .filter(([k, v]) => k !== 'memoryEpisodeWritten' && !v)
      .map(([k]) => k);
    if (blocking.length > 0) {
      await this.projectRepo.update(projectId, { lifecycleStatus: 'blocked' });
      await this.feedService.addLifecycleEvent(
        tenantId,
        projectId,
        'lifecycle_updated',
        `Cannot complete — missing: ${blocking.join(', ')}`,
      );
      return this.cardService.build(tenantId, projectId);
    }
    await this.projectRepo.update(projectId, {
      lifecycleStatus: 'completed',
      completedAt: new Date(),
      completionChecklist: { ...checklist, memoryEpisodeWritten: true },
    });

    await this.memoryService.writeCompletionEpisode(tenantId, projectId, card);

    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'project_completed',
      'Project completed and memory saved.',
    );
    return this.cardService.build(tenantId, projectId);
  }

  async cancelProject(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectCompletionCard> {
    const project = await this.findProject(tenantId, projectId);
    if (!project || TERMINAL_STATUSES.has(project.lifecycleStatus)) {
      return this.cardService.build(tenantId, projectId);
    }
    await this.projectRepo.update(projectId, { lifecycleStatus: 'cancelled' });
    await this.feedService.addLifecycleEvent(
      tenantId,
      projectId,
      'lifecycle_updated',
      'Project cancelled.',
    );
    return this.cardService.build(tenantId, projectId);
  }

  async refreshStatus(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectCompletionCard> {
    const card = await this.cardService.build(tenantId, projectId);
    if (
      card.checklist.allTasksTerminal &&
      card.status === 'waiting_for_agents'
    ) {
      await this.projectRepo.update(projectId, {
        lifecycleStatus: 'waiting_for_review',
      });
      await this.feedService.addLifecycleEvent(
        tenantId,
        projectId,
        'lifecycle_updated',
        'All tasks finished — ready for review.',
      );
    } else if (
      !card.checklist.noBlockedTasks &&
      card.status === 'waiting_for_agents'
    ) {
      await this.projectRepo.update(projectId, { lifecycleStatus: 'blocked' });
      await this.feedService.addLifecycleEvent(
        tenantId,
        projectId,
        'lifecycle_updated',
        'One or more tasks are blocked.',
      );
    }
    return this.cardService.build(tenantId, projectId);
  }

  async getLifecycleStatus(
    projectId: string,
    tenantId: string,
  ): Promise<string | null> {
    const project = await this.findProject(tenantId, projectId);
    return project?.lifecycleStatus ?? null;
  }

  private async findProject(
    tenantId: string,
    projectId: string,
  ): Promise<DiveSeeksProject | null> {
    return this.projectRepo.findOne({
      where: { id: projectId, teamId: tenantId },
      select: [
        'id',
        'teamId',
        'lifecycleStatus',
        'completionSummary',
        'completionChecklist',
        'updateRequests',
      ],
    });
  }
}
