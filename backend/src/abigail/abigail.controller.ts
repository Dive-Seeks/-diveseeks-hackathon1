import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Res,
  Logger,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { PushGitContextDto } from './dto/push-git-context.dto';
import { CompleteInterviewDto } from './dto/complete-interview.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HireService } from './hire.service';
import { BootService } from './boot.service';
import { BudgetService } from './budget.service';
import { AbigailService } from './abigail.service';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { VisionSeederService } from '../tce/vision/vision-seeder.service';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentEvolutionEvent } from '../jos/entities/agent-evolution-event.entity';
import { TaskSession } from './entities/task-session.entity';
import { TaskStepLog } from './entities/task-step-log.entity';
import { AbigailMindService } from './abigail-mind.service';
import { BrainIntentClassifierService } from '../abigail-brain/brain-intent-classifier.service';
import { BrainSessionService } from '../abigail-brain/brain-session.service';
import { BrainTechniqueService } from '../abigail-brain/brain-technique.service';
import { ProjectContextService } from './project-context.service';
import { TenantSpecialistConfigService } from './tenant-specialist-config.service';
import { TenantSlotService } from '../common/tenant-slot/tenant-slot.service';

export class EnsureSpecialistDto {
  @IsString() domain: string;
}

export class GetEvolutionEventsDto {
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}

export class EnsureIndustryDto {
  @IsString() industry: string;
}

import { AbigailRequestDto } from './dto/abigail-request.dto';
import { TerminalErrorDto } from './dto/terminal-error.dto';
import { UpsertSpecialistConfigDto } from './dto/upsert-specialist-config.dto';
import { pipeAgentUIStreamToResponse } from 'ai';
import { ChatAgentFactory } from './specialists/chat-agent.factory';
import { UserChatService } from '../chat/user-chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { TCETask } from '../tce/entities/tce-task.entity';
import { DeveloperProfile } from './entities/developer-profile.entity';
import { SpecKitEntryService } from '../data-engine';
import { AgentChatService } from '../agent-chat/agent-chat.service';
import { ChatService } from '../chat/chat.service';
import { ProjectIntentService } from './project-intent.service';
import { ProjectLifecycleService } from './project-lifecycle.service';
import { WorkflowPhaseEvent } from './workflow-phase-event.types';
import { CanvasStopDto } from './dto/canvas-stop.dto';
import { SessionSummaryService } from './session-summary.service';
import {
  TEAM_SPECIALISTS,
  TEAM_DEFAULTS,
} from '../tce/gap-analysis/goal-decomposer.service';
import { WorkflowRunService } from './workflow-queue/workflow-run.service';
import {
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from './workflow-queue/workflow-orchestrator.interface';
import {
  QueueUnavailableError,
  AGENT_RUN_QUEUE,
} from './workflow-queue/workflow-queue.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';

@Controller('abigail')
export class AbigailController {
  private readonly logger = new Logger(AbigailController.name);

  constructor(
    private readonly bootService: BootService,
    private readonly hireService: HireService,
    private readonly budgetService: BudgetService,
    private readonly abigailService: AbigailService,
    private readonly tenantCls: TenantClsService,
    private readonly tenantSlotService: TenantSlotService,
    private readonly visionSeeder: VisionSeederService,
    @InjectRepository(AgentEvolutionEvent)
    private readonly evolutionRepo: Repository<AgentEvolutionEvent>,
    private readonly brainIntentClassifier: BrainIntentClassifierService,
    private readonly brainSessionService: BrainSessionService,
    private readonly brainTechniqueService: BrainTechniqueService,
    private readonly redisCacheService: RedisCacheService,
    private readonly salesGateway: SalesGateway,
    private readonly jwtService: JwtService,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    @InjectRepository(TaskStepLog)
    private readonly stepLogRepo: Repository<TaskStepLog>,
    private readonly abigailMindService: AbigailMindService,
    private readonly projectContextService: ProjectContextService,
    private readonly tenantSpecialistConfigService: TenantSpecialistConfigService,
    private readonly chatAgentFactory: ChatAgentFactory,
    private readonly userChatService: UserChatService,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    @InjectRepository(DeveloperProfile)
    private readonly developerProfileRepo: Repository<DeveloperProfile>,
    private readonly specKit: SpecKitEntryService,
    private readonly agentChat: AgentChatService,
    private readonly chatService: ChatService,
    private readonly projectIntentService: ProjectIntentService,
    private readonly projectLifecycleService: ProjectLifecycleService,
    private readonly sessionSummaryService: SessionSummaryService,
    private readonly workflowRun: WorkflowRunService,
    @Inject(WORKFLOW_ORCHESTRATOR)
    private readonly workflowQueue: WorkflowOrchestrator,
    @InjectQueue(AGENT_RUN_QUEUE) private readonly agentRunQueue: Queue,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('boot')
  async boot() {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId) throw new ForbiddenException('No tenant context in token');
    const coordinator = await this.bootService.bootTenant(tenantId);
    return { coordinator };
  }

  @UseGuards(JwtAuthGuard)
  @Post('terminal-error')
  async terminalError(@Body() dto: TerminalErrorDto) {
    const abigailRequest: AbigailRequestDto = {
      teamId: this.tenantCls.getTenantId() ?? dto.teamId,
      userId: this.tenantCls.getUserId() ?? dto.userId,
      projectId: dto.projectId,
      message: `[TERMINAL ERROR from ${dto.terminalName}]\n${dto.error}${dto.stack ? '\n' + dto.stack : ''}`,
    };
    return this.abigailService.handleRequest(abigailRequest);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request')
  async request(@Body() dto: AbigailRequestDto) {
    // Trigger 1 - Front Door Brainstorm Check
    const intent = await this.brainIntentClassifier.classify(dto.message);

    if (intent.requiresIdeation) {
      const userId = (this.tenantCls.getUserId() ?? dto.userId) as string;
      const tenantId = this.tenantCls.getTenantId() ?? dto.teamId ?? userId;

      const activeSession = await this.brainSessionService.getActive(
        tenantId,
        userId,
      );
      if (activeSession) {
        return {
          brainstormRequired: true,
          sessionId: activeSession.id,
          technique: activeSession.technique,
          topic: activeSession.topic,
        };
      }

      // Check for recently completed session (last 5 minutes)
      const recentlyCompleted =
        await this.brainSessionService.getRecentlyCompleted(
          tenantId,
          userId,
          5,
        );

      if (!recentlyCompleted) {
        const session = await this.brainSessionService.open({
          topic: dto.message,
          intentType: intent.type as any,
          tenantId,
          userId,
        });

        return {
          brainstormRequired: true,
          sessionId: session.id,
          technique: session.technique,
          topic: session.topic,
        };
      }
    }

    const resolvedUserId = this.tenantCls.getUserId() ?? dto.userId;
    const abigailRequest: AbigailRequestDto = {
      teamId: this.tenantCls.getTenantId() ?? dto.teamId ?? resolvedUserId,
      userId: resolvedUserId,
      projectId: dto.projectId,
      message: dto.message,
      specialist: dto.specialist,
      alsoSpecialist: dto.alsoSpecialist,
      team: dto.team,
    };
    return this.abigailService.handleRequest(abigailRequest);
  }

  @UseGuards(JwtAuthGuard)
  @Post('canvas-run')
  async canvasRun(@Body() dto: { projectId: string; team: string }) {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId() ?? userId;
    if (!tenantId || !userId) throw new ForbiddenException('No tenant context');

    const runId = randomUUID();
    const lockAcquired = await this.tenantSlotService.tryLockProject(
      dto.projectId,
      300,
      runId,
    );
    if (!lockAcquired) {
      return {
        dispatched: false,
        reason: 'already_running',
        projectId: dto.projectId,
      };
    }

    try {
      const prep = await this.workflowRun.prepareRun({
        projectId: dto.projectId,
        team: dto.team,
        tenantId,
        userId,
        runId,
      });

      if ('skip' in prep) {
        await this.tenantSlotService.unlockProjectIfOwner(dto.projectId, runId);
        return {
          dispatched: false,
          reason: prep.skip,
          projectId: dto.projectId,
        };
      }

      // CEO speaks synchronously for instant UX; the durable job picks up coordinator_reading onward.
      this.salesGateway.emitWorkflowPhase(dto.projectId, {
        phase: 'ceo_speaking',
        ceoPlan:
          `I am planning ${prep.jobsCount} job${prep.jobsCount === 1 ? '' : 's'} across the project goals. ` +
          `Spec, plan and task files are ready in Docs. Assigning now.`,
        docsCount: 3,
        jobsCount: prep.jobsCount,
      });
      this.projectLifecycleService
        .startRun(tenantId, dto.projectId)
        .catch((err) =>
          this.logger.error(`[canvas-run] startRun failed: ${err.message}`),
        );

      try {
        await this.workflowQueue.startRun({
          runId: prep.runId,
          projectId: dto.projectId,
          team: dto.team,
          tenantId,
          userId,
          taskIds: prep.taskIds,
        });
      } catch (err) {
        await this.tenantSlotService.unlockProjectIfOwner(dto.projectId, runId);
        if (err instanceof QueueUnavailableError) {
          return {
            dispatched: false,
            reason: 'queue_unavailable',
            projectId: dto.projectId,
          };
        }
        throw err;
      }

      return {
        dispatched: true,
        runId: prep.runId,
        projectId: dto.projectId,
        taskCount: prep.jobsCount,
      };
    } catch (error) {
      await this.tenantSlotService.unlockProjectIfOwner(dto.projectId, runId);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('canvas-stop')
  @HttpCode(200)
  async canvasStop(@Body() dto: CanvasStopDto) {
    const userId = this.tenantCls.getUserId();
    const tenantId = this.tenantCls.getTenantId() ?? userId;
    if (!tenantId) throw new ForbiddenException('No tenant context');

    const status = await this.projectLifecycleService.getLifecycleStatus(
      dto.projectId,
      tenantId,
    );
    if (status === 'paused') {
      // No live job to flag — terminate directly: release lock, clear flag, mark cancelled,
      // and emit workflow_done so all listeners (and other tabs) leave the paused state.
      const pausedRunId = await this.tenantSlotService.getProjectLockValue(
        dto.projectId,
      );
      if (pausedRunId)
        await this.tenantSlotService.unlockProjectIfOwner(
          dto.projectId,
          pausedRunId,
        );
      await this.tenantSlotService.clearHaltFlag(dto.projectId, tenantId);
      // End Run returns the project to idle (re-runnable), NOT a terminal 'cancelled'
      // that would block the next canvas-run via startRun's terminal guard.
      await this.projectLifecycleService.finishRun(tenantId, dto.projectId);
      this.salesGateway.emitWorkflowPhase(dto.projectId, {
        phase: 'workflow_done',
        reportSection: '## Completion Report\nRun ended by user.',
        completedCount: 0,
        needsReviewCount: 0,
        blockedCount: 0,
        totalCount: 0,
      });
      return { stopped: true, projectId: dto.projectId };
    }

    await this.tenantSlotService.setHaltFlag(dto.projectId, tenantId, 'stop');

    // If the run job hasn't started yet, cancel it outright; a running job stops cooperatively.
    const runId = await this.tenantSlotService.getProjectLockValue(
      dto.projectId,
    );
    if (runId) {
      const job = await this.agentRunQueue.getJob(runId);
      const state = job ? await job.getState() : null;
      if (job && (state === 'waiting' || state === 'delayed')) {
        await job.remove();
        await this.tenantSlotService.unlockProjectIfOwner(dto.projectId, runId);
      }
    }
    return { stopped: true, projectId: dto.projectId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('canvas-pause')
  @HttpCode(200)
  async canvasPause(@Body() dto: { projectId: string }) {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId) throw new ForbiddenException('No tenant context');
    await this.tenantSlotService.setHaltFlag(dto.projectId, tenantId, 'pause');
    return { paused: true, projectId: dto.projectId };
  }

  @UseGuards(JwtAuthGuard)
  @Post('canvas-resume')
  @HttpCode(200)
  async canvasResume(@Body() dto: { projectId: string; team: string }) {
    const tenantId = this.tenantCls.getTenantId() ?? this.tenantCls.getUserId();
    if (!tenantId) throw new ForbiddenException('No tenant context');

    // Only a paused run can be resumed; otherwise the caller should use canvas-run.
    const status = await this.projectLifecycleService.getLifecycleStatus(
      dto.projectId,
      tenantId,
    );
    if (status !== 'paused') {
      return { resumed: false, reason: 'not_paused', projectId: dto.projectId };
    }

    // canvas-run handles lock + prepareRun (skips done tasks) + enqueue. Map its
    // dispatch-shaped response onto the resume contract the frontend expects.
    const result = (await this.canvasRun(dto)) as any;
    if (result?.dispatched === false) {
      return {
        resumed: false,
        reason: result.reason,
        projectId: dto.projectId,
      };
    }
    this.salesGateway.emitWorkflowPhase(dto.projectId, {
      phase: 'workflow_resumed',
    });
    return {
      resumed: true,
      runId: result.runId,
      projectId: dto.projectId,
      taskCount: result.taskCount,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('run-state/:projectId')
  async getRunState(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId) throw new ForbiddenException('No tenant context');

    const status = await this.projectLifecycleService.getLifecycleStatus(
      projectId,
      tenantId,
    );
    return { status: status ?? 'unknown' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('spec-files/:projectId')
  async getSpecFiles(@Param('projectId') projectId: string) {
    const [spec, plan, tasks] = await Promise.all([
      this.specKit.readCached(projectId, 'specs/current/spec.md'),
      this.specKit.readCached(projectId, 'specs/current/plan.md'),
      this.specKit.readCached(projectId, 'specs/current/tasks.md'),
    ]);
    return { spec, plan, tasks };
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatRequestDto, @Req() req: any, @Res() res: any) {
    const userId = (dto.userId ?? this.tenantCls.getUserId())!;
    const tenantId = this.tenantCls.getTenantId() ?? userId;
    this.logger.log(
      `[chat] projectId=${dto.projectId} team=${dto.team ?? 'general'} userId=${userId} messageCount=${req.body?.messages?.length ?? 0}`,
    );
    const context = {
      specialist: dto.specialist ?? 'quest',
      tenantId,
      userId,
      projectId: dto.projectId,
      team: dto.team ?? 'general',
    };
    const agent = this.chatAgentFactory.build(context);

    // AI SDK useChat sends messages[] in body; fall back to constructing from dto.message
    const uiMessages = (
      req.body?.messages?.length
        ? req.body.messages
        : [
            {
              id: 'msg-1',
              role: 'user',
              content: dto.message,
              parts: [{ type: 'text', text: dto.message }],
            },
          ]
    ) as any[];
    const userMessage = this.extractLastUserMessage(uiMessages) ?? dto.message;

    if (userMessage) {
      const intentResult = this.projectIntentService.classify(userMessage);
      if (
        ['complete', 'update', 'approve', 'cancel'].includes(
          intentResult.intent,
        )
      ) {
        this.projectLifecycleService
          .processUserIntent(dto.projectId, tenantId, intentResult)
          .catch((err) =>
            this.logger.error(
              `[chat] Lifecycle evaluation failed: ${err.message}`,
            ),
          );
      }

      await this.userChatService.persist({
        tenantId,
        projectId: dto.projectId,
        userId,
        team: dto.team ?? 'general',
        role: 'user',
        content: userMessage,
        specialistId: dto.specialist,
      });
      await this.chatService
        .saveMessage(tenantId, dto.team ?? 'general', {
          senderType: 'user',
          senderRole: 'tenant',
          senderId: userId,
          content: userMessage,
          projectId: dto.projectId,
          threadId: `workflow:${dto.projectId}`,
          interactionType: 'user_message',
        })
        .catch(() => undefined);
    }

    await pipeAgentUIStreamToResponse({
      response: res,
      agent,
      uiMessages,
      onStepFinish: async (step: any) => {
        if (step.text) {
          await this.userChatService
            .persist({
              tenantId,
              projectId: dto.projectId,
              userId,
              team: dto.team ?? 'general',
              role: 'assistant',
              content: step.text,
              specialistId: dto.specialist,
              tokenCount: step.usage?.completionTokens ?? 0,
            })
            .catch(() => {});
          await this.chatService
            .saveMessage(tenantId, dto.team ?? 'general', {
              senderType: 'agent',
              senderRole: 'abigail',
              agentName: dto.specialist ?? 'abigail-chat',
              content: step.text,
              projectId: dto.projectId,
              threadId: `workflow:${dto.projectId}`,
              interactionType: 'assistant_message',
            })
            .catch(() => undefined);
          // Chat has no task sessionId — skip recordUsage (passing 'chat'
          // caused uuid syntax error; budget tracking for direct chat is out of scope).
        }
      },
    });
  }

  private extractLastUserMessage(uiMessages: any[]): string | undefined {
    const lastUser = [...uiMessages]
      .reverse()
      .find((message) => message?.role === 'user');
    if (!lastUser) return undefined;
    if (typeof lastUser.content === 'string' && lastUser.content.trim()) {
      return lastUser.content;
    }
    const textParts = Array.isArray(lastUser.parts)
      ? lastUser.parts
          .filter(
            (part: any) =>
              part?.type === 'text' && typeof part.text === 'string',
          )
          .map((part: any) => part.text)
          .join('\n')
          .trim()
      : '';
    return textParts || undefined;
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessionHistory(
    @Query('projectId') projectId: string,
    @Query('team') team?: string,
    @Query('limit') limitStr?: string,
    @Query('status') statusFilter?: string,
  ) {
    const tenantId = this.tenantCls.getTenantId();
    const userId = this.tenantCls.getUserId();
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 100);

    this.logger.log(
      `[AbigailController] GET /sessions — projectId=${projectId ?? '(none)'} team=${team ?? '(none)'} status=${statusFilter ?? 'done'} tenantId=${tenantId ?? '(none)'} limit=${limit}`,
    );

    if (!projectId) {
      this.logger.warn(
        '[AbigailController] GET /sessions — projectId missing, returning empty',
      );
      return [];
    }

    const allowedStatuses = ['pending', 'in_progress', 'done', 'failed'];
    const resolvedStatus = (
      allowedStatuses.includes(statusFilter ?? '') ? statusFilter : 'done'
    ) as any;

    const whereClause = {
      projectId,
      status: resolvedStatus,
      ...(tenantId ? { teamId: tenantId } : {}),
      ...(team ? { team: team as any } : {}),
    };
    this.logger.log(
      `[AbigailController] GET /sessions — query where: ${JSON.stringify(whereClause)}`,
    );

    const sessions = await this.taskSessionRepo.find({
      where: whereClause,
      order: { createdAt: 'ASC' },
      take: limit,
      select: [
        'id',
        'taskDescription',
        'result',
        'specialist',
        'team',
        'createdAt',
      ],
    });

    // Reconstruct as flat chat message pairs: user → assistant
    const messages = sessions.flatMap((s) => {
      const pairs: {
        role: 'user' | 'assistant';
        content: string;
        specialist?: string;
        sessionId: string;
      }[] = [{ role: 'user', content: s.taskDescription, sessionId: s.id }];
      if (s.result) {
        pairs.push({
          role: 'assistant',
          content: s.result,
          specialist: s.specialist ?? undefined,
          sessionId: s.id,
        });
      }
      return pairs;
    });

    this.logger.log(
      `[AbigailController] Session history for project=${projectId} team=${team ?? 'any'}: ${sessions.length} sessions → ${messages.length} messages`,
    );

    return messages;
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const tenantId = this.tenantCls.getTenantId();
    this.logger.log(
      `[AbigailController] Fetching task session ${id} for tenant ${tenantId}`,
    );
    const session = await this.taskSessionRepo.findOne({
      where: { id, teamId: tenantId ?? undefined },
    });
    if (!session) {
      this.logger.warn(
        `[AbigailController] Task session ${id} NOT FOUND for tenant ${tenantId}`,
      );
      throw new NotFoundException(`Task session ${id} not found`);
    }
    this.logger.log(
      `[AbigailController] Session found! ${JSON.stringify(session)}`,
    );
    return session;
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:id/steps')
  async getSessionSteps(@Param('id') id: string) {
    const tenantId = this.tenantCls.getTenantId();
    const steps = await this.stepLogRepo.find({
      where: { sessionId: id, tenantId: tenantId ?? undefined },
      order: { createdAt: 'ASC' },
    });
    return steps;
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:id/resume')
  async resumeSession(@Param('id') id: string) {
    const tenantId = this.tenantCls.getTenantId();
    const userId = this.tenantCls.getUserId();

    const session = await this.taskSessionRepo.findOne({
      where: { id, teamId: tenantId ?? undefined },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    if (session.status !== 'orphaned' && session.status !== 'needs_human') {
      throw new BadRequestException(
        `Session status is '${session.status}' — only orphaned or needs_human sessions can be resumed`,
      );
    }

    session.status = 'pending';
    session.checkoutRunId = null;
    session.executionLockedAt = null;
    await this.taskSessionRepo.save(session);

    this.abigailMindService
      .dispatch(session.id)
      .catch((err) =>
        this.logger.error(`Resume dispatch failed for session ${id}`, err),
      );

    return {
      resumed: true,
      sessionId: id,
      fromStep: session.lastCompletedStep,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('project-context/:projectId')
  async getProjectContext(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId()!;
    return this.projectContextService.getProjectContext(projectId, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('evolution-events')
  async getEvolutionEvents(@Query() query: GetEvolutionEventsDto) {
    const tenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const domain = query.domain;

    const where: any = { tenant_id: tenantId };
    if (domain) where.domain = domain;

    const [data, total] = await this.evolutionRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: Math.min(limit, 100),
      skip: (page - 1) * Math.min(limit, 100),
    });

    return { data, total, page, limit };
  }

  @UseGuards(JwtAuthGuard)
  @Post('ensure-specialist')
  async ensureSpecialist(@Body() dto: EnsureSpecialistDto) {
    const safeTenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    return this.hireService.ensureSpecialist(safeTenantId, dto.domain);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ensure-industry')
  async ensureIndustry(@Body() dto: EnsureIndustryDto) {
    return this.hireService.ensureIndustry(dto.industry);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/diveseeks/projects/:projectId/seed-vision-from-data')
  async seedVisionFromData(@Param('projectId') projectId: string) {
    const tenantId = this.tenantCls.getTenantId()!;
    return this.visionSeeder.seedFromWiki(projectId, tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('budget')
  async budget() {
    const safeTenantId =
      this.tenantCls.getTenantId() ?? '00000000-0000-0000-0000-000000000000';
    const usage = await this.budgetService.getUsage(safeTenantId);
    return {
      usedCents: Math.round(usage.spentUsd * 100),
      limitCents: Math.round(usage.limitUsd * 100),
      percentUsed: usage.pct,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profiles/me')
  async getMyProfile() {
    const userId = this.tenantCls.getUserId();
    if (!userId) throw new ForbiddenException('No user in token');
    return this.abigailService.getMyProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profiles/:profileId')
  async getProfile(@Param('profileId') profileId: string) {
    const userId = this.tenantCls.getUserId();
    if (!userId) throw new ForbiddenException('No user in token');
    return this.abigailService.getProfile(profileId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profiles/:profileId')
  async completeInterview(
    @Param('profileId') profileId: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    const userId = this.tenantCls.getUserId();
    if (!userId) throw new ForbiddenException('No user in token');
    return this.abigailService.completeInterview(profileId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('diveseeks/git-context')
  async pushGitContext(@Body() dto: PushGitContextDto) {
    const tenantId = this.tenantCls.getTenantId();
    if (tenantId !== dto.teamId) {
      throw new ForbiddenException(
        'teamId does not match authenticated tenant',
      );
    }
    const redisKey = `tenant:${tenantId}:project:${dto.projectId}:git-context`;
    await this.redisCacheService.set(
      redisKey,
      JSON.stringify({
        log: dto.log,
        status: dto.status,
        tree: dto.tree,
        pushedAt: new Date().toISOString(),
      }),
      600,
    );
    return { success: true, message: 'Context pushed' };
  }

  /**
   * Issues a short-lived (60s) SSE nonce so the CLI can open the event stream
   * without embedding the long-lived JWT in the URL (which would land in logs).
   */
  @UseGuards(JwtAuthGuard)
  @Post('diveseeks/sse-token')
  async issueSseToken() {
    const userId = this.tenantCls.getUserId()!;
    const tenantId = this.tenantCls.getTenantId()!;
    const nonce = await this.jwtService.signAsync(
      { userId, tenantId, purpose: 'sse' },
      { expiresIn: '60s' },
    );
    return { token: nonce };
  }

  @Get('diveseeks/events')
  async sseEvents(
    @Query('teamId') teamId: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (!token) throw new ForbiddenException('No token provided');

    let userId: string;
    let tenantId: string;

    try {
      const payload = await this.jwtService.verifyAsync(token);
      userId = payload.userId;
      tenantId = payload.tenantId;
    } catch {
      throw new ForbiddenException('Invalid or expired token');
    }

    if (tenantId !== teamId) {
      throw new ForbiddenException('Token tenant does not match teamId');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(': connected\n\n');

    const listener = (payload: any) => {
      if (payload.teamId === teamId && payload.userId === userId) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    this.salesGateway.internalEmitter.on('task_complete', listener);
    this.salesGateway.internalEmitter.on('task_failed', listener);

    const keepAlive = setInterval(() => res.write(':\n\n'), 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      this.salesGateway.internalEmitter.off('task_complete', listener);
      this.salesGateway.internalEmitter.off('task_failed', listener);
      res.end();
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('specialist-config')
  async getSpecialistConfigs() {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId) throw new ForbiddenException('No tenant context in token');
    return this.tenantSpecialistConfigService.getAll(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('specialist-config/:specialistId')
  async updateSpecialistConfig(
    @Param('specialistId') specialistId: string,
    @Body() dto: UpsertSpecialistConfigDto,
  ) {
    const tenantId = this.tenantCls.getTenantId();
    if (!tenantId) throw new ForbiddenException('No tenant context in token');
    return this.tenantSpecialistConfigService.upsert(
      tenantId,
      specialistId,
      dto,
    );
  }
}
