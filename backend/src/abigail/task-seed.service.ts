import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateText } from 'ai';
import { TaskSession } from './entities/task-session.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { SpecKitEntryService } from '../data-engine';
import {
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from './workflow-queue/workflow-orchestrator.interface';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { VisionService } from '../tce/vision/vision.service';

@Injectable()
export class TaskSeedService {
  private readonly logger = new Logger(TaskSeedService.name);

  constructor(
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    private readonly specKit: SpecKitEntryService,
    @Inject(WORKFLOW_ORCHESTRATOR)
    private readonly workflowQueue: WorkflowOrchestrator,
    private readonly salesGateway: SalesGateway,
    private readonly aiRouter: AiProviderRouter,
    private readonly visionService: VisionService,
  ) {}

  async autoDispatchTceTasks(params: {
    projectId: string;
    teamId: string;
    userId: string;
    team: string;
  }): Promise<void> {
    let tasks = await this.tceTaskRepo.find({
      where: { projectId: params.projectId, status: 'queued' },
      order: { priority: 'DESC' },
    });

    const emptyTenantTasks = tasks.filter((t) => !t.tenantId);
    if (emptyTenantTasks.length > 0) {
      await this.tceTaskRepo.update(
        emptyTenantTasks.map((t) => t.id),
        { tenantId: params.teamId },
      );
      emptyTenantTasks.forEach((t) => {
        t.tenantId = params.teamId;
      });
    }

    if (tasks.length === 0) {
      const seeded = await this.specKit
        .seedTasks(params.projectId, params.teamId)
        .catch((err) => {
          this.logger.warn(
            `[SpecKit] task seeding fallback failed: ${(err as Error).message}`,
          );
          return [];
        });
      if (seeded.length > 0) {
        tasks.push(...seeded);
        this.logger.log(
          `[autoDispatch] Seeded ${seeded.length} tasks from tasks.md`,
        );
      }
    }

    tasks = await this.rebuildIncompatibleQueuedTasksIfNeeded(tasks, params);

    if (tasks.length === 0) {
      this.logger.warn(
        `[autoDispatch] No tasks seeded and tasks.md missing. Skipping fallback to vision goals for project ${params.projectId}`,
      );
    }

    this.logger.log(
      `[autoDispatch] ${tasks.length} queued tasks for project ${params.projectId}`,
    );

    for (const task of tasks) {
      const existingSession = await this.taskSessionRepo.findOne({
        where: [
          {
            teamId: params.teamId,
            projectId: params.projectId,
            taskDescription: task.description,
            status: 'pending',
          },
          {
            teamId: params.teamId,
            projectId: params.projectId,
            taskDescription: task.description,
            status: 'running',
          },
        ],
        select: ['id'],
      });
      if (existingSession) {
        this.logger.warn(
          `[autoDispatch] Dedup: skipping session creation — active session ${existingSession.id} already exists for task "${(task.title ?? task.description ?? '').substring(0, 60)}"`,
        );
        continue;
      }

      const session = new TaskSession();
      session.teamId = params.teamId;
      session.userId = params.userId;
      session.projectId = params.projectId;
      session.specialist = task.specialist;
      session.alsoSpecialist = task.alsoSpecialist ?? undefined;
      session.team = params.team as any;
      session.outputType = 'text';
      session.status = 'pending';
      session.taskDescription = task.description;
      session.context = {
        rules: [],
        errorPatterns: [],
        projectContext: {},
        tceTaskId: task.id,
        goalId: task.goalId,
        source: 'tce_auto',
      };
      session.profileFlags = {
        skillLevel: 'experienced',
        taskSizeMultiplier: task.taskSizeMultiplier ?? 1.0,
        needsInlineComments: false,
        needsPrExplanation: false,
        offerImprovement: true,
        learningMaterialDepth: 0,
      };
      await this.taskSessionRepo.save(session);

      await this.tceTaskRepo.update(task.id, {
        status: 'in_progress',
        sessionId: session.id,
      });

      this.workflowQueue
        .startSession({
          sessionId: session.id,
          tenantId: params.teamId,
          userId: params.userId,
        })
        .catch((err) =>
          this.logger.error(`Auto enqueue failed for task ${task.id}`, err),
        );
    }

    if (tasks.length > 0) {
      this.salesGateway.emitProjectFeedUpdate(params.projectId, {
        type: 'tasks_created',
        projectId: params.projectId,
        count: tasks.length,
      });
    }
  }

  private async rebuildIncompatibleQueuedTasksIfNeeded(
    tasks: TCETask[],
    params: {
      projectId: string;
      teamId: string;
      userId: string;
      team: string;
    },
  ): Promise<TCETask[]> {
    if (params.team === 'coding' || tasks.length === 0) {
      return tasks;
    }

    const incompatible = tasks.filter((task) =>
      this.isSoftwareEngineeringTask(task),
    );
    if (incompatible.length === 0) {
      return tasks;
    }

    await this.tceTaskRepo.delete(tasks.map((task) => task.id));
    this.logger.warn(
      `[autoDispatch] Discarded ${tasks.length} incompatible ${params.team} tasks for project ${params.projectId}; rebuilding from vision goals`,
    );
    await this.rebuildQueuedTasksFromVision(
      params.projectId,
      params.teamId,
      params.team,
    );

    return this.tceTaskRepo.find({
      where: { projectId: params.projectId, status: 'queued' },
      order: { priority: 'DESC' },
    });
  }

  private isSoftwareEngineeringTask(
    task: Pick<TCETask, 'title' | 'description'>,
  ): boolean {
    const text = `${task.title ?? ''} ${task.description ?? ''}`.toLowerCase();
    return [
      'route',
      'page',
      'ui',
      'component',
      'frontend',
      'backend',
      'api',
      'form',
      'storage',
      'database',
      'nest',
      'next.js',
      'implement',
      'build the /',
      'landing page',
    ].some((keyword) => text.includes(keyword));
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
        `[autoDispatch] No active vision goals available to rebuild ${team} tasks for project ${projectId}`,
      );
      return;
    }

    const specialists = this.getCompatibleSpecialists(team);
    const rebuilt = goals.slice(0, 8).map((goal, index) =>
      this.tceTaskRepo.create({
        projectId,
        tenantId,
        goalId: goal.id,
        title: this.buildCompatibleTaskTitle(team, goal.title),
        description: this.buildCompatibleTaskDescription(
          team,
          goal.title,
          goal.description,
        ),
        specialist: specialists[
          index % specialists.length
        ] as TCETask['specialist'],
        priority: Math.max(1, 100 - index * 5),
        source: 'tce',
        status: 'queued',
        taskSizeMultiplier: 1.0,
      }),
    );

    await this.tceTaskRepo.save(rebuilt);
  }

  private getCompatibleSpecialists(team: string): string[] {
    if (team === 'research') {
      return ['lit', 'cite', 'scribe', 'synth', 'peer'];
    }

    return ['quest', 'gist', 'memo', 'plan', 'echo'];
  }

  private buildCompatibleTaskTitle(team: string, goalTitle: string): string {
    if (team === 'research') {
      return `Research evidence for ${goalTitle}`;
    }

    return `Clarify and structure ${goalTitle}`;
  }

  private buildCompatibleTaskDescription(
    team: string,
    goalTitle: string,
    goalDescription?: string,
  ): string {
    const detail = (goalDescription ?? '').trim();
    if (team === 'research') {
      return `Investigate the goal "${goalTitle}", gather supporting evidence, note open questions, and produce a concise research brief.${detail ? ` Context: ${detail}` : ''}`;
    }

    return `Review the goal "${goalTitle}", capture the user's intent, identify missing details, and produce a clear execution brief for the team.${detail ? ` Context: ${detail}` : ''}`;
  }

  async processSuggestion(params: {
    projectId: string;
    tenantId: string;
    userId: string;
    suggestion: string;
  }): Promise<void> {
    const vision = await this.visionService.getVision(params.projectId);
    if (!vision) {
      this.logger.warn(
        `[processSuggestion] No vision for project ${params.projectId}`,
      );
      return;
    }

    const existingTasks = await this.tceTaskRepo.find({
      where: { projectId: params.projectId, status: 'queued' },
      order: { priority: 'DESC' },
    });

    const goalSummary = vision.goals
      .map((g) => `- ${g.title} (${g.status})`)
      .join('\n');
    const existingTaskSummary = existingTasks
      .slice(0, 10)
      .map((t) => `- [${t.specialist}] ${t.title}`)
      .join('\n');

    const model = this.aiRouter.getModel('chat');
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Abigail CEO. A user has submitted a suggestion for project "${vision.name}".
Current goals:\n${goalSummary}
Existing queued tasks:\n${existingTaskSummary || 'none'}

Decide what to do. Respond in JSON with this shape:
{
  "action": "create_tasks" | "no_action",
  "reason": "one sentence",
  "tasks": [
    { "goalId": "<id from goals>", "title": "<short>", "description": "<detail>", "specialist": "<rex|nova|kai|sage|atlas|orion|pixel|luma|felix|vex>" }
  ]
}
Return empty tasks array for no_action.`,
        },
        {
          role: 'user',
          content: params.suggestion,
        },
      ],
    });

    let parsed: {
      action: string;
      reason: string;
      tasks: {
        goalId: string;
        title: string;
        description: string;
        specialist: string;
      }[];
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      this.logger.warn(`[processSuggestion] CEO response was not valid JSON`);
      return;
    }

    if (parsed.action === 'create_tasks' && parsed.tasks?.length) {
      for (const t of parsed.tasks) {
        await this.tceTaskRepo.save(
          this.tceTaskRepo.create({
            projectId: params.projectId,
            tenantId: params.tenantId,
            goalId: t.goalId,
            title: t.title,
            description: t.description,
            specialist: t.specialist as any,
            priority: 60,
            source: 'user' as const,
            status: 'queued' as const,
            taskSizeMultiplier: 1.0,
          }),
        );
      }
      this.salesGateway.emitProjectFeedUpdate(params.projectId, {
        type: 'tasks_created',
        projectId: params.projectId,
        count: parsed.tasks.length,
      });
    }

    this.logger.log(
      `[processSuggestion] action=${parsed.action} tasks=${parsed.tasks?.length ?? 0} reason="${parsed.reason}"`,
    );
  }
}
