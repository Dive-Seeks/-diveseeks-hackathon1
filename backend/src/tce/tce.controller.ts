import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  NotFoundException,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AbigailMindService } from '../abigail/abigail-mind.service';
import { FindOptionsWhere } from 'typeorm';
import { VisionFile, VisionGoal } from './vision/vision.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { TceService } from './tce.service';
import { VisionService } from './vision/vision.service';
import { SmartVisionSetupService } from './vision/smart-vision-setup.service';
import { VisionInterviewService } from './vision/vision-interview.service';
import {
  VisionChatTurn,
  UserAction,
  VisionStep,
} from './vision/vision-setup-envelope.types';
import { VisionConflictService } from './vision/vision-conflict.service';
import { SpecKitEntryService } from '../data-engine';
import { ProgressService } from './progress/progress.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TCETask } from './entities/tce-task.entity';
import { DiveSeeksProject } from './entities/diveseeks-project.entity';
import { ProjectCardService } from '../abigail/project-card.service';

@Controller('diveseeks/projects')
@UseGuards(JwtAuthGuard)
export class TceController {
  constructor(
    private readonly tceService: TceService,
    private readonly visionService: VisionService,
    private readonly smartVisionSetup: SmartVisionSetupService,
    private readonly visionConflictService: VisionConflictService,
    private readonly visionInterviewService: VisionInterviewService,
    private readonly specKit: SpecKitEntryService,
    private readonly progressService: ProgressService,
    private readonly tenantCls: TenantClsService,
    @Inject(forwardRef(() => AbigailMindService))
    private readonly abigailMind: AbigailMindService,
    @InjectRepository(TCETask)
    private readonly tceTaskRepository: Repository<TCETask>,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepository: Repository<DiveSeeksProject>,
    private readonly projectCardService: ProjectCardService,
  ) {}

  @Post()
  async createProject(
    @Body()
    dto: {
      teamId?: string;
      name: string;
      team?: 'coding' | 'general' | 'research';
      githubRepo?: string;
      techStack?: string[];
      description?: string;
    },
  ) {
    const tenantId = this.tenantCls.getTenantId();
    const userId = this.tenantCls.getUserId();
    return this.tceService.createProjectWithRepo(
      tenantId ?? dto.teamId ?? null,
      dto.name,
      dto.team ?? 'coding',
      dto.githubRepo,
      dto.techStack,
      dto.description,
      userId ?? undefined,
    );
  }

  @Get('check-name')
  async checkName(@Query('name') name: string) {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId();
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (tenantId) conditions.push({ teamId: tenantId, name, active: true });
    if (userId) conditions.push({ userId, name, active: true });
    if (conditions.length === 0)
      conditions.push({ teamId: '', name, active: true });
    const existing = await this.projectRepository.findOne({
      where: conditions,
    });
    return { available: !existing };
  }

  @Get('workflow-ready')
  async listWorkflowReadyProjects() {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId();
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (userId) conditions.push({ userId, active: true });
    if (tenantId) conditions.push({ teamId: tenantId, active: true });
    if (conditions.length === 0)
      conditions.push({
        teamId: '00000000-0000-0000-0000-000000000000',
        active: true,
      });
    const projects = await this.projectRepository.find({
      where: conditions,
      order: { createdAt: 'DESC' },
    });

    const results = await Promise.all(
      projects.map(async (p) => {
        const vision = await this.visionService.getVision(p.id);
        if (vision?.setupComplete !== true) return null;
        const taskCount = await this.tceTaskRepository.count({
          where: { projectId: p.id },
        });
        return { ...p, visionReady: true, taskCount };
      }),
    );

    return results.filter(Boolean);
  }

  @Get(':projectId/completion-card')
  async getCompletionCard(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    return this.projectCardService.build(tenantId, projectId);
  }

  @Get(':projectId')
  async getProject(@Param('projectId') projectId: string) {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId();
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (userId) conditions.push({ id: projectId, userId, active: true });
    if (tenantId)
      conditions.push({ id: projectId, teamId: tenantId, active: true });
    if (conditions.length === 0)
      conditions.push({ id: projectId, active: true });
    const project = await this.projectRepository.findOne({ where: conditions });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  @Get()
  async listProjects() {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId();
    // Build OR conditions: match rows saved by userId OR by teamId (covers projects
    // created before userId column existed, or via tenant-only paths)
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (userId) conditions.push({ userId, active: true });
    if (tenantId) conditions.push({ teamId: tenantId, active: true });
    if (conditions.length === 0)
      conditions.push({
        teamId: '00000000-0000-0000-0000-000000000000',
        active: true,
      });
    const projects = await this.projectRepository.find({
      where: conditions,
      order: { createdAt: 'DESC' },
    });

    // Attach visionReady flag: true only when vision file has setupComplete === true
    const withVisionStatus = await Promise.all(
      projects.map(async (p) => {
        const vision = await this.visionService.getVision(p.id);
        return { ...p, visionReady: vision?.setupComplete === true };
      }),
    );

    return withVisionStatus;
  }

  @Get(':projectId/vision')
  async getVision(@Param('projectId') projectId: string) {
    return this.visionService.getVision(projectId);
  }

  @Get(':projectId/vision/chat-history')
  async getVisionChatHistory(@Param('projectId') projectId: string) {
    return this.visionService.getChatHistory(projectId);
  }

  @Post(':projectId/vision')
  async initializeVision(
    @Param('projectId') projectId: string,
    @Body() dto: VisionFile,
  ) {
    const existing = await this.visionService.getVision(projectId);
    const merged: VisionFile = existing ? { ...existing, ...dto } : dto;
    return this.visionService.updateVision(projectId, merged);
  }

  @Post(':projectId/vision/chat')
  async visionChat(
    @Param('projectId') projectId: string,
    @Body()
    dto: {
      projectName: string;
      history: VisionChatTurn[];
      userAction: UserAction | null;
      currentStep?: VisionStep;
    },
  ) {
    const userId = this.tenantCls.getUserId()!;
    const tenantId = this.tenantCls.getTenantId() ?? userId;
    return this.smartVisionSetup.chat({
      projectId,
      projectName: dto.projectName,
      tenantId,
      userId,
      history: dto.history,
      userAction: dto.userAction,
      currentStep: dto.currentStep,
    });
  }

  @Put(':projectId/vision/goals')
  async addOrUpdateGoal(
    @Param('projectId') projectId: string,
    @Body() dto: { goal: Omit<VisionGoal, 'tasks' | 'progress'> },
  ) {
    return this.visionService.addOrUpdateGoal(projectId, dto.goal);
  }

  @Post(':projectId/vision/check')
  async checkVision(
    @Param('projectId') projectId: string,
    @Body() dto: { message: string },
  ) {
    const vision = await this.visionService.getVision(projectId);
    if (!vision)
      return { type: 'NO_VISION', message: 'Vision not set up yet.' };
    const classification = this.visionConflictService.classifyMessage(
      dto.message,
      vision,
    );
    const details = classification.details as
      | { goalTitle?: string; progress?: number }
      | undefined;
    const response = this.visionConflictService.getResponseTemplate(
      classification.type,
      {
        locked: vision.techStack.locked[0],
        forbidden: classification.match || vision.techStack.forbidden[0],
        constraint: classification.match || vision.constraints[0],
        goalId: classification.match,
        goalTitle: details?.goalTitle,
        progress: details?.progress,
      },
    );
    return { conflictType: classification.type, ...response };
  }

  @Get(':projectId/goals/progress')
  async getProgress(@Param('projectId') projectId: string) {
    const vision = await this.visionService.getVision(projectId);
    if (!vision || !vision.goals) return { goals: [] };

    const tasks = await this.tceTaskRepository.find({ where: { projectId } });
    const goalsProgress = vision.goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      progress: this.progressService.calculateGoalProgress(goal, tasks),
      status: goal.status,
    }));
    return { goals: goalsProgress };
  }

  @Get(':projectId/tasks')
  async getTasks(@Param('projectId') projectId: string) {
    const tasks = await this.tceTaskRepository.find({
      where: { projectId },
      order: { priority: 'DESC' },
    });
    return {
      tasks,
      queued: tasks.filter((t) => t.status === 'queued').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    };
  }

  @Get(':projectId/tasks-with-goals')
  async getTasksWithGoals(@Param('projectId') projectId: string) {
    const tasks = await this.tceTaskRepository.find({
      where: { projectId },
      order: { priority: 'DESC' },
    });

    const vision = await this.visionService.getVision(projectId);
    const visionGoals = vision?.goals ?? [];

    const grouped = visionGoals.map((goal) => ({
      goalId: goal.id,
      goalTitle: goal.title,
      goalStatus: goal.status,
      tasks: tasks
        .filter((t) => t.goalId === goal.id)
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          specialist: t.specialist,
          alsoSpecialist: t.alsoSpecialist ?? undefined,
          priority: t.priority,
          status: t.status,
          sessionId: t.sessionId ?? undefined,
          source: t.source,
          createdAt: t.createdAt.toISOString(),
        })),
    }));

    const knownGoalIds = new Set(visionGoals.map((g) => g.id));
    const orphaned = tasks.filter((t) => !knownGoalIds.has(t.goalId));
    if (orphaned.length > 0) {
      grouped.push({
        goalId: 'other',
        goalTitle: 'Other',
        goalStatus: 'not_started' as const,
        tasks: orphaned.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          specialist: t.specialist,
          alsoSpecialist: t.alsoSpecialist ?? undefined,
          priority: t.priority,
          status: t.status,
          sessionId: t.sessionId ?? undefined,
          source: t.source,
          createdAt: t.createdAt.toISOString(),
        })),
      });
    }

    return { goals: grouped };
  }

  @Post(':projectId/tasks')
  async createTask(
    @Param('projectId') projectId: string,
    @Body()
    dto: {
      goalId: string;
      title: string;
      description: string;
      specialist: string;
      priority?: number;
    },
  ) {
    const tenantId = this.tenantCls.getTenantId();
    const task = await this.tceTaskRepository.save(
      this.tceTaskRepository.create({
        projectId,
        tenantId: tenantId ?? '',
        goalId: dto.goalId,
        title: dto.title,
        description: dto.description,
        specialist: dto.specialist as any,
        priority: dto.priority ?? 50,
        source: 'user' as const,
        status: 'queued' as const,
        taskSizeMultiplier: 1.0,
      }),
    );
    return { task };
  }

  @Patch(':projectId/tasks/:taskId/status')
  async updateTaskStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: { status: 'done' | 'blocked' },
  ) {
    const task = await this.tceTaskRepository.findOne({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (!['done', 'blocked'].includes(dto.status)) {
      throw new BadRequestException('status must be done or blocked');
    }
    await this.tceTaskRepository.update(taskId, { status: dto.status });
    return { updated: true, status: dto.status };
  }

  @Delete(':projectId/tasks/:taskId')
  @HttpCode(HttpStatus.OK)
  async deleteTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.tceTaskRepository.findOne({
      where: { id: taskId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status === 'in_progress') {
      throw new BadRequestException('Cannot delete a task that is in progress');
    }
    await this.tceTaskRepository.delete(taskId);
    return { deleted: true };
  }

  @Post(':projectId/run-gap-analysis')
  async runGapAnalysis(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    const result = await this.tceService.runGapAnalysis(projectId, tenantId);
    return { status: 'success', ...result };
  }

  @Patch(':projectId/workflow-type')
  async setWorkflowType(
    @Param('projectId') projectId: string,
    @Body() dto: { workflowType: 'autonomous' | 'canvas' },
  ) {
    if (!['autonomous', 'canvas'].includes(dto.workflowType)) {
      throw new BadRequestException(
        'workflowType must be autonomous or canvas',
      );
    }

    const tenantId = this.tenantCls.getTenantId() ?? '';
    const userId = this.tenantCls.getUserId() ?? '';

    // 1. Scope project lookup to this tenant (Rule 9 — every query filters by tenant_id)
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (userId) conditions.push({ id: projectId, userId, active: true });
    if (tenantId)
      conditions.push({ id: projectId, teamId: tenantId, active: true });
    if (conditions.length === 0)
      conditions.push({ id: projectId, active: true });
    const project = await this.projectRepository.findOne({ where: conditions });
    if (!project) throw new NotFoundException('Project not found');

    // 2. Persist the workflow choice (tenant-scoped update)
    await this.projectRepository.update(
      { id: projectId, teamId: project.teamId },
      { workflowType: dto.workflowType },
    );

    // 3. Generate PRD from vision goals (always, regardless of workflow type)
    const vision = await this.visionService.getVision(projectId);
    const goals = vision?.goals ?? [];
    await this.tceService.generateProjectPrd(projectId, tenantId, goals);

    // 4. Auto-dispatch only for autonomous mode
    if (dto.workflowType === 'autonomous') {
      await this.abigailMind.autoDispatchTceTasks({
        projectId,
        teamId: tenantId,
        userId,
        team: project.team,
      });
    }

    return { workflowType: dto.workflowType, prdGenerated: true };
  }

  // ── Brain-powered vision interview ────────────────────────────────────────

  @Post(':projectId/vision/interview/start')
  async startInterview(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    const userId = this.tenantCls.getUserId() ?? '';
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.visionInterviewService.start(
      projectId,
      tenantId,
      userId,
      project.name,
      project.description ?? '',
    );
  }

  @Post(':projectId/vision/interview/chat')
  async interviewChat(
    @Param('projectId') projectId: string,
    @Body() dto: { sessionId: string; message: string },
  ) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    const userId = this.tenantCls.getUserId() ?? '';
    return this.visionInterviewService.chat(
      dto.sessionId,
      projectId,
      tenantId,
      userId,
      dto.message,
    );
  }

  // ── SpecKit documents ─────────────────────────────────────────────────────

  @Get(':projectId/speckit')
  async getSpeckitDocs(@Param('projectId') projectId: string) {
    const FILES = [
      {
        key: 'constitution',
        path: 'memory/constitution.md',
        label: 'Constitution',
        createdBy: 'abigail-ceo',
      },
      {
        key: 'spec',
        path: 'specs/current/spec.md',
        label: 'Spec',
        createdBy: 'abigail-ceo',
      },
      {
        key: 'plan',
        path: 'specs/current/plan.md',
        label: 'Plan',
        createdBy: 'abigail-ceo',
      },
      {
        key: 'tasks',
        path: 'specs/current/tasks.md',
        label: 'Tasks',
        createdBy: 'abigail-ceo',
      },
      {
        key: 'prd',
        path: 'specs/current/prd.md',
        label: 'PRD',
        createdBy: 'abigail-ceo',
      },
      {
        key: 'audit',
        path: 'memory/audit-log.md',
        label: 'Audit Log',
        createdBy: 'abigail-ceo',
      },
    ];
    const docs = await Promise.all(
      FILES.map(async (f) => ({
        key: f.key,
        label: f.label,
        createdBy: f.createdBy,
        content: await this.specKit.read(projectId, f.path),
      })),
    );
    return { docs: docs.filter((d) => d.content !== null) };
  }

  // Manual trigger — generates spec/plan/tasks from vision for projects where vision:ready
  // already fired but SpecKit docs were never written (e.g., projects created before this fix).
  @Post(':projectId/speckit/generate')
  async generateSpeckitDocs(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    const vision = await this.visionService.getVision(projectId);
    if (!vision) {
      throw new BadRequestException(
        'Project has no vision — complete vision setup first',
      );
    }
    const taskDescription = vision.goals?.length
      ? vision.goals.map((g: any) => g.title).join('; ')
      : (vision.name ?? 'Project setup');
    const visionSummary = (vision as any).summary ?? vision.description ?? '';
    const result = await this.specKit.generate({
      projectId,
      tenantId,
      taskDescription,
      clarificationAnswers: {
        'Project overview': visionSummary || 'Per completed vision interview',
      },
      visionSummary,
    });
    return { phase: result.phase, generated: result.phase === 'ready' };
  }
}
