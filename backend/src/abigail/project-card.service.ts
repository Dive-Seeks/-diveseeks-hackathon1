import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { TaskSession } from './entities/task-session.entity';
import { VisionService } from '../tce/vision/vision.service';
import { SpecKitEntryService } from '../data-engine';
import type {
  ProjectCompletionCard,
  ProjectCompletionChecklist,
  ProjectUpdateRequest,
} from './project-lifecycle.types';

@Injectable()
export class ProjectCardService {
  constructor(
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    @InjectRepository(TCETask)
    private readonly taskRepo: Repository<TCETask>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    private readonly visionService: VisionService,
    private readonly specKit: SpecKitEntryService,
  ) {}

  async build(
    tenantId: string,
    projectId: string,
  ): Promise<ProjectCompletionCard> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, teamId: tenantId },
      select: [
        'id',
        'teamId',
        'lifecycleStatus',
        'completionSummary',
        'completionChecklist',
        'updateRequests',
        'updatedAt',
      ],
    });
    if (!project) {
      return this.emptyCard(tenantId, projectId);
    }

    const [tasks, sessions, vision] = await Promise.all([
      this.taskRepo.find({
        where: { projectId },
        select: ['id', 'title', 'specialist', 'status', 'sessionId'],
      }),
      this.sessionRepo.find({
        where: { projectId },
        select: ['id', 'specialist', 'status'],
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.visionService.getVision(projectId).catch(() => null),
    ]);

    const goals = (vision?.goals ?? []).map((g: any) => ({
      id: g.id,
      title: g.title,
      status: g.status ?? 'pending',
      progress: g.progress,
    }));

    const [spec, plan, tasksDoc] = await Promise.all([
      this.specKit.read(projectId, 'specs/current/spec.md'),
      this.specKit.read(projectId, 'specs/current/plan.md'),
      this.specKit.read(projectId, 'specs/current/tasks.md'),
    ]);

    const documents = [
      spec
        ? {
            path: 'specs/current/spec.md',
            title: 'Spec',
            kind: 'spec' as const,
          }
        : null,
      plan
        ? {
            path: 'specs/current/plan.md',
            title: 'Plan',
            kind: 'plan' as const,
          }
        : null,
      tasksDoc
        ? {
            path: 'specs/current/tasks.md',
            title: 'Tasks',
            kind: 'tasks' as const,
          }
        : null,
    ].filter((d): d is NonNullable<typeof d> => d !== null);

    const terminalStatuses = new Set(['done', 'blocked', 'cancelled']);
    const allTasksTerminal =
      tasks.length > 0 && tasks.every((t) => terminalStatuses.has(t.status));
    const noBlockedTasks = tasks.every((t) => t.status !== 'blocked');
    const allGoalsComplete =
      goals.length > 0 && goals.every((g) => g.status === 'complete');
    const requiredDocsPresent = !!spec && !!plan && !!tasksDoc;
    const stored = project.completionChecklist ?? {};
    const coordinatorReviewed = stored['coordinatorReviewed'] ?? false;
    const finalSummaryReady = !!project.completionSummary?.trim();
    const memoryEpisodeWritten = stored['memoryEpisodeWritten'] ?? false;

    const checklist: ProjectCompletionChecklist = {
      allTasksTerminal,
      noBlockedTasks,
      allGoalsComplete,
      requiredDocsPresent,
      coordinatorReviewed,
      finalSummaryReady,
      userApprovalRequired: true,
      memoryEpisodeWritten,
    };

    const nextAction = this.resolveNextAction(checklist);

    const activeSessions = sessions
      .filter((s) => s.status === 'running' || s.status === 'pending')
      .map((s) => ({ id: s.id, specialist: s.specialist, status: s.status }));

    return {
      projectId,
      tenantId,
      status: (project.lifecycleStatus as any) ?? 'draft',
      summary: project.completionSummary ?? '',
      originalRequest: null,
      currentUserAsk: null,
      goals,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        specialist: t.specialist,
        status: t.status,
        sessionId: t.sessionId ?? null,
      })),
      activeSessions,
      documents,
      updateRequests: (project.updateRequests as ProjectUpdateRequest[]) ?? [],
      checklist,
      nextAction,
      lastActivityAt: project.updatedAt?.toISOString() ?? null,
    };
  }

  private resolveNextAction(
    c: ProjectCompletionChecklist,
  ): ProjectCompletionCard['nextAction'] {
    if (!c.noBlockedTasks) return 'blocked';
    if (!c.allTasksTerminal) return 'run_agents';
    if (!c.allGoalsComplete || !c.requiredDocsPresent) return 'review_outputs';
    if (!c.coordinatorReviewed || !c.finalSummaryReady) return 'review_outputs';
    if (c.userApprovalRequired) return 'ask_user';
    return 'mark_complete';
  }

  private emptyCard(
    tenantId: string,
    projectId: string,
  ): ProjectCompletionCard {
    return {
      projectId,
      tenantId,
      status: 'draft',
      summary: '',
      originalRequest: null,
      currentUserAsk: null,
      goals: [],
      tasks: [],
      activeSessions: [],
      documents: [],
      updateRequests: [],
      checklist: {
        allTasksTerminal: false,
        noBlockedTasks: true,
        allGoalsComplete: false,
        requiredDocsPresent: false,
        coordinatorReviewed: false,
        finalSummaryReady: false,
        userApprovalRequired: true,
        memoryEpisodeWritten: false,
      },
      nextAction: 'run_agents',
      lastActivityAt: null,
    };
  }
}
