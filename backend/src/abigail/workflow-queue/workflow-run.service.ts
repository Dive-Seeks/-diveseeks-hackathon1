import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { TCETask } from '../../tce/entities/tce-task.entity';
import { TaskSession } from '../entities/task-session.entity';
import { DeveloperProfile } from '../entities/developer-profile.entity';
import { SpecKitEntryService } from '../../data-engine';
import { BrainSessionService } from '../../abigail-brain/brain-session.service';
import { VisionService } from '../../tce/vision/vision.service';

export type PrepareRunResult =
  | { skip: 'no_queued_tasks' | 'needs_review_pending' }
  | { runId: string; taskIds: string[]; jobsCount: number };

@Injectable()
export class WorkflowRunService {
  private readonly logger = new Logger(WorkflowRunService.name);

  constructor(
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    @InjectRepository(DeveloperProfile)
    private readonly developerProfileRepo: Repository<DeveloperProfile>,
    private readonly specKit: SpecKitEntryService,
    private readonly brainSessionService: BrainSessionService,
    private readonly visionService: VisionService,
  ) {}

  async prepareRun(params: {
    projectId: string;
    team: string;
    tenantId: string;
    userId: string;
    runId: string;
  }): Promise<PrepareRunResult> {
    const { projectId, team, tenantId, userId, runId } = params;

    await this.brainSessionService.dismissAllIdeating(tenantId, userId);
    await this.ensureProfileComplete(userId);

    // Collect stale session IDs BEFORE we clear them from tasks, so we can cancel
    // the sessions too. The AbigailService dedup guard reuses pending sessions by
    // taskDescription match — stale ones must be cancelled or a new Run re-dispatches
    // the same ghost session instead of creating a fresh one.
    const needsReviewCount = await this.tceTaskRepo.count({
      where: { projectId, status: 'needs_review' },
    });
    if (needsReviewCount > 0) {
      this.logger.warn(
        `[prepareRun] ${needsReviewCount} needs_review task(s) require explicit recovery for project ${projectId}`,
      );
      return { skip: 'needs_review_pending' };
    }

    const staleTasks = await this.tceTaskRepo.find({
      where: {
        projectId,
        status: In(['in_progress', 'blocked']),
      },
      select: ['sessionId'],
    });
    const staleSessionIds = staleTasks
      .map((t) => t.sessionId)
      .filter((id): id is string => !!id);
    if (staleSessionIds.length > 0) {
      await this.sessionRepo.update(
        { id: In(staleSessionIds), status: 'pending' },
        { status: 'cancelled' },
      );
    }

    // Reset stuck/terminal tasks back to queued so every new Run re-dispatches them.
    // in_progress: stalled from a crash/restart.
    // blocked: failed on a prior run — retry on the next run.
    for (const status of ['in_progress', 'blocked'] as const) {
      await this.tceTaskRepo.update(
        { projectId, status },
        { status: 'queued', sessionId: null as any },
      );
    }

    // Re-seed check: tasks.md is coding-team-specific. For general/research teams
    // the ensureCompatibleQueuedTasks step will rebuild tasks from vision goals, so
    // re-seeding coding tasks from tasks.md only to throw them away is wasteful and
    // causes every general/research run to discard tasks on every invocation.
    if (team === 'coding') {
      const existing = await this.tceTaskRepo.find({
        where: { projectId },
        select: ['id', 'title'],
      });
      if (existing.length > 0) {
        const tasksContent = await this.specKit.read(
          projectId,
          'specs/current/tasks.md',
        );
        const idCount = (tasksContent?.match(/^\s*-\s+id:\s+TASK-/gm) ?? [])
          .length;
        const fileTitles = await this.specKit.getTaskTitlesFromFile(projectId);

        if (idCount > 0 && fileTitles.length < idCount) {
          // Parser returned fewer titles than raw id: lines — tasks.md is unparseable.
          // Skip reconciliation entirely; keep whatever is in DB.
          this.logger.warn(
            `[prepareRun] tasks.md parse health check failed (${fileTitles.length} titles vs ${idCount} ids) — skipping reconciliation for project ${projectId}`,
          );
        } else if (fileTitles.length > 0) {
          // Parser is healthy. Add only tasks that are in the file but missing from DB.
          const existingTitles = new Set(
            existing.map((t) => (t.title ?? '').trim().toLowerCase()),
          );
          const missingTitles = fileTitles.filter(
            (ft) => !existingTitles.has(ft),
          );
          if (missingTitles.length > 0) {
            this.logger.log(
              `[prepareRun] Adding ${missingTitles.length} missing tasks to DB for project ${projectId}`,
            );
            await this.specKit.seedTasks(projectId, tenantId);
          }
        }
      } else {
        await this.specKit.seedTasks(projectId, tenantId);
      }
    }

    const allQueued = await this.ensureCompatibleQueuedTasks(
      projectId,
      tenantId,
      params.team,
    );
    if (allQueued.length === 0) return { skip: 'no_queued_tasks' };

    // Deduplicate by title (keep newest = first, since ordered DESC), delete the rest.
    const seen = new Map<string, (typeof allQueued)[0]>();
    const dupIds: string[] = [];
    for (const t of allQueued) {
      const key = (t.title ?? '').trim().toLowerCase();
      if (seen.has(key)) dupIds.push(t.id);
      else seen.set(key, t);
    }
    if (dupIds.length > 0) {
      await this.tceTaskRepo.delete(dupIds);
      this.logger.log(
        `[prepareRun] Removed ${dupIds.length} duplicate tasks for project ${projectId}`,
      );
    }

    const tasks = [...seen.values()].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    );
    return { runId, taskIds: tasks.map((t) => t.id), jobsCount: tasks.length };
  }

  private async ensureProfileComplete(userId: string): Promise<void> {
    const profile = await this.developerProfileRepo.findOne({
      where: { userId },
    });
    if (profile && !profile.interviewCompleted) {
      await this.developerProfileRepo.update(profile.id, {
        interviewCompleted: true,
        skillLevel: profile.skillLevel || 'experienced',
        taskSizeMultiplier: profile.taskSizeMultiplier || 1.0,
      });
    } else if (!profile) {
      await this.developerProfileRepo.save(
        this.developerProfileRepo.create({
          userId,
          skillLevel: 'experienced',
          taskSizeMultiplier: 1.0,
          needsInlineComments: false,
          needsPrExplanation: false,
          offerImprovement: true,
          learningMaterialDepth: 0,
          interviewCompleted: true,
        }),
      );
    }
  }

  private async ensureCompatibleQueuedTasks(
    projectId: string,
    tenantId: string,
    team: string,
  ): Promise<TCETask[]> {
    let queued = await this.tceTaskRepo.find({
      where: { projectId, status: 'queued' },
      order: { createdAt: 'DESC' },
    });
    if (team === 'coding' || queued.length === 0) {
      return queued;
    }

    const incompatible = queued.filter((task) =>
      this.isSoftwareEngineeringTask(task),
    );
    if (incompatible.length === 0) {
      return queued;
    }

    // Delete only incompatible tasks; leave compatible tasks untouched.
    const incompatibleIds = incompatible.map((t) => t.id);
    await this.tceTaskRepo.delete(incompatibleIds);
    this.logger.warn(
      `[prepareRun] Discarded incompatible tasks: ${incompatibleIds.join(', ')}`,
    );

    const compatible = queued.filter(
      (task) => !this.isSoftwareEngineeringTask(task),
    );

    // Only rebuild from vision if no compatible tasks remain after the delete.
    if (compatible.length === 0) {
      this.logger.warn(
        `[prepareRun] All ${team} tasks were incompatible for project ${projectId}; rebuilding from vision goals`,
      );
      await this.rebuildQueuedTasksFromVision(projectId, tenantId, team);

      queued = await this.tceTaskRepo.find({
        where: { projectId, status: 'queued' },
        order: { createdAt: 'DESC' },
      });
      return queued;
    }

    return compatible;
  }

  private isSoftwareEngineeringTask(
    task: Pick<TCETask, 'title' | 'description'>,
  ): boolean {
    const text = `${task.title ?? ''} ${task.description ?? ''}`;
    // Require 2+ strong software-engineering signals to avoid false positives.
    // Bare words like 'api', 'ui', 'form', 'page' alone appear in ordinary English
    // (e.g. "redesign the UI text", "first page of the report") — do NOT trigger.
    const signals = [
      /\bimplements?\b/i,
      /\bAPIs?\b/i,
      /\bdatabases?\b/i,
      /\bendpoints?\b/i,
      /\bbackends?\b/i,
      /\bfrontends?\b/i,
      /\bschemas?\b/i,
      /\bmigrations?\b/i,
      /\bORMs?\b/i,
      /\bSQL\b/i,
      /\bHTTPs?\b/i,
      /\bRESTful\b/i,
    ].filter((re) => re.test(text));
    return signals.length >= 2;
  }

  private async rebuildQueuedTasksFromVision(
    projectId: string,
    tenantId: string,
    team: string,
  ): Promise<void> {
    const vision = await this.visionService.getVision(projectId);
    const goals = (vision?.goals ?? []).filter(
      (goal) => goal.status !== 'complete',
    );
    if (goals.length === 0) {
      this.logger.warn(
        `[prepareRun] No active vision goals available to rebuild ${team} tasks for project ${projectId}`,
      );
      return;
    }

    const specialists =
      team === 'research'
        ? ['lit', 'cite', 'scribe', 'synth', 'peer']
        : ['quest', 'gist', 'memo', 'plan', 'echo'];

    const visionContext = vision?.description ?? '';
    const rebuilt = goals.slice(0, 8).map((goal, index) => {
      const goalContext = goal.description ?? visionContext ?? '';
      return this.tceTaskRepo.create({
        projectId,
        tenantId,
        goalId: goal.id,
        title:
          team === 'research'
            ? `Research evidence for: ${goal.title}${goalContext ? ` — ${goalContext}` : ''}`
            : `Clarify and structure: ${goal.title}${goalContext ? ` — ${goalContext}` : ''}`,
        description:
          team === 'research'
            ? `Investigate the goal "${goal.title}", gather supporting evidence, note open questions, and produce a concise research brief.${goalContext ? ` Context: ${goalContext}` : ''}`
            : `Review the goal "${goal.title}", capture the user's intent, identify missing details, and produce a clear execution brief for the team.${goalContext ? ` Context: ${goalContext}` : ''}`,
        specialist: specialists[
          index % specialists.length
        ] as TCETask['specialist'],
        priority: Math.max(1, 100 - index * 5),
        source: 'tce',
        status: 'queued',
        taskSizeMultiplier: 1.0,
      });
    });
    await this.tceTaskRepo.save(rebuilt);
  }
}
