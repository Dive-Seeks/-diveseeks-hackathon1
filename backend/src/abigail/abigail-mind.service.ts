import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { generateText } from 'ai';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { TaskSession } from './entities/task-session.entity';
import { CodingSpecialistFactory } from './specialists/coding-specialist.factory';
import { SpecialistRegistryService } from './specialists/specialist-registry.service';
import { VisionService } from '../tce/vision/vision.service';
import { McpToolbeltService } from '../mcp-registry/mcp-toolbelt.service';
import { SpecialistId } from '../mcp-registry/entities/mcp-server-registration.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { SnapshotService } from './snapshot/snapshot.service';
import { DataEngineContextService } from './data-engine-context.service';
import { AgentsService } from '../agents/agents.service';
import { SandboxService } from '../sandbox/sandbox.service';
import { SessionBridgeService } from '../memory/session-bridge.service';
import { ParametricWeightService } from '../memory/parametric-weight.service';
import { SAFE_PAIRS } from './reasoning/reasoning.types';
import { HermesService } from '../hermes/hermes.service';
import { BrainDispatchGuardService } from '../abigail-brain/brain-dispatch-guard.service';
import { BrainIntentClassifierService } from '../abigail-brain/brain-intent-classifier.service';
import { GitContextService } from './git-context.service';
import { UnifiedKnowledgeService } from './unified-knowledge.service';
import { FileExtractorService } from './file-extractor.service';
import { DisciplineScorerService } from './discipline-scorer.service';
import { IssuesService } from '../issues/issues.service';
import { CodingSpecialistBootstrapService } from './specialists/coding-specialist-bootstrap.service';
import { CyclePubSubService } from '../common/cycle-pubsub.service';
import { PrdGeneratorService } from '../task-prd/prd-generator.service';
import { LoopOrchestratorService } from '../task-prd/loop-orchestrator.service';
import { GoalProgressService } from '../task-prd/goal-progress.service';
import { TaskPrdFeatureMap } from '../task-prd/entities/task-prd-feature-map.entity';
import { TenantSlotService } from '../common/tenant-slot/tenant-slot.service';
import { TCETask } from '../tce/entities/tce-task.entity';
import { AgentChatService } from '../agent-chat/agent-chat.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { SkillService } from '../workforce/skills/skill.service';
import { PluginService } from '../workforce/plugins/plugin.service';
import { HookEngine } from '../common/hooks/hook-engine.service';
import { AgentHookContext } from '../common/hooks/agent-hook.interface';
import { SpecKitEntryService } from '../data-engine';
import { DispatchEngineService } from './dispatch/dispatch-engine.service';
import {
  WORKFLOW_ORCHESTRATOR,
  WorkflowOrchestrator,
} from './workflow-queue/workflow-orchestrator.interface';
import { TaskSeedService } from './task-seed.service';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';

const PIPELINE_STEPS = [
  { step: 'intent_check', agentName: 'Abigail (Intent)' },
  { step: 'context_load', agentName: 'Abigail (Context)' },
  { step: 'prd_generation', agentName: 'Abigail (PRD)' },
  { step: 'specialist', agentName: 'Specialist' },
  { step: 'review', agentName: 'Abigail (Review)' },
  { step: 'done', agentName: 'Done' },
] as const;

@Injectable()
export class AbigailMindService implements OnModuleInit {
  private readonly logger = new Logger(AbigailMindService.name);

  constructor(
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    private readonly dataSource: DataSource,
    private readonly specialistFactory: CodingSpecialistFactory,
    private readonly specialistRegistry: SpecialistRegistryService,
    private readonly agentsService: AgentsService,
    private readonly contextService: DataEngineContextService,
    private readonly visionService: VisionService,
    private readonly toolbeltService: McpToolbeltService,
    private readonly salesGateway: SalesGateway,
    private readonly snapshotService: SnapshotService,
    private readonly sandboxService: SandboxService,
    private readonly sessionBridge: SessionBridgeService,
    private readonly parametricWeightService: ParametricWeightService,
    private readonly hermesService: HermesService,
    private readonly brainDispatchGuard: BrainDispatchGuardService,
    private readonly brainIntentClassifier: BrainIntentClassifierService,
    private readonly gitContextService: GitContextService,
    private readonly unifiedKnowledgeService: UnifiedKnowledgeService,
    private readonly fileExtractorService: FileExtractorService,
    private readonly disciplineScorerService: DisciplineScorerService,
    private readonly issuesService: IssuesService,
    private readonly specialistBootstrap: CodingSpecialistBootstrapService,
    private readonly cyclePubSub: CyclePubSubService,
    private readonly prdGenerator: PrdGeneratorService,
    private readonly loopOrchestrator: LoopOrchestratorService,
    private readonly goalProgress: GoalProgressService,
    @InjectRepository(TaskPrdFeatureMap)
    private readonly featureMapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    private readonly tenantSlot: TenantSlotService,
    private readonly aiRouter: AiProviderRouter,
    private readonly agentChat: AgentChatService,
    private readonly tokenizerService: TokenizerService,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly skillService: SkillService,
    private readonly pluginService: PluginService,
    private readonly hookEngine: HookEngine,
    private readonly specKit: SpecKitEntryService,
    private readonly dispatchEngine: DispatchEngineService,
    @Inject(WORKFLOW_ORCHESTRATOR)
    private readonly workflowQueue: WorkflowOrchestrator,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    private readonly taskSeed: TaskSeedService,
  ) {}

  onModuleInit() {
    this.cyclePubSub.onVisionReady(async (event) => {
      this.logger.log(
        `[AbigailMind] vision:ready — project ${event.projectId}`,
      );

      // Generate constitution.md from vision before anything else runs
      await this.specKit
        .generateConstitution(event.projectId)
        .catch((err) =>
          this.logger.warn(
            `[SpecKit] constitution generation failed: ${(err as Error).message}`,
          ),
        );

      // Auto-generate spec/plan/tasks from vision — vision interview already collected all
      // necessary information so a separate clarification round is redundant.
      // This ensures Docs tab has content immediately after vision setup.
      const vision = await this.visionService
        .getVision(event.projectId)
        .catch(() => null);
      if (vision) {
        const taskDescription = vision.goals?.length
          ? vision.goals.map((g: any) => g.title).join('; ')
          : (vision.name ?? 'Project setup');
        const visionSummary =
          (vision as any).summary ?? vision.description ?? '';
        // Load project.team so spec/tasks use correct specialist pool
        const project = await this.projectRepo
          .findOne({ where: { id: event.projectId, teamId: event.teamId } })
          .catch(() => null);

        await this.specKit
          .generate({
            projectId: event.projectId,
            tenantId: event.teamId,
            taskDescription,
            // Provide synthetic answer from vision so the clarification gate is bypassed
            clarificationAnswers: {
              'Project overview':
                visionSummary || 'Per completed vision interview',
            },
            visionSummary,
            team: project?.team ?? 'coding',
          })
          .catch((err) =>
            this.logger.warn(
              `[SpecKit] spec/plan/tasks generation failed: ${(err as Error).message}`,
            ),
          );
        this.logger.log(
          `[SpecKit] spec/plan/tasks auto-generated for project ${event.projectId} team=${project?.team ?? 'coding'}`,
        );
      }

      // Seed TCETasks from tasks.md if the spec-kit lifecycle already wrote one
      const seeded = await this.specKit
        .seedTasks(event.projectId, event.teamId)
        .catch((err) => {
          this.logger.warn(
            `[SpecKit] task mapping failed: ${(err as Error).message}`,
          );
          return [];
        });

      if (seeded.length > 0) {
        this.logger.log(
          `[SpecKit] Seeded ${seeded.length} TCETasks from tasks.md for project ${event.projectId}`,
        );
      }

      // autoDispatchTceTasks is now triggered by PATCH /projects/:id/workflow-type
      // when the user selects 'autonomous' mode after the vision interview.
    });
  }

  private emitProgress(
    session: TaskSession,
    stepKey: (typeof PIPELINE_STEPS)[number]['step'],
    status: 'running' | 'done' | 'failed',
    message?: string,
  ) {
    const idx = PIPELINE_STEPS.findIndex((s) => s.step === stepKey);
    const meta = PIPELINE_STEPS[idx] ?? PIPELINE_STEPS[0];
    this.salesGateway.emitTaskProgress({
      sessionId: session.id,
      tenantId: session.teamId,
      userId: session.userId,
      step: stepKey,
      stepIndex: idx + 1,
      totalSteps: PIPELINE_STEPS.length,
      agentName: meta.agentName,
      status,
      message,
    });
  }

  private buildHookCtx(
    session: TaskSession,
    extra: Record<string, unknown> = {},
  ): AgentHookContext {
    return {
      sessionId: session.id,
      tenantId: session.teamId,
      specialist: session.specialist,
      team: session.team ?? 'coding',
      taskDescription: session.taskDescription,
      metadata: {
        projectId: session.projectId,
        userId: session.userId,
        ...extra,
      },
    };
  }

  private scoreMessage(
    msg: ChatMessage,
    currentSession: TaskSession,
    goalAncestry: any,
  ): number {
    let score = 0;
    if (msg.threadId === currentSession.id) score += 3.0;
    // Source overlap signal: same project thread is a strong relevance indicator
    if (
      msg.projectId === currentSession.projectId &&
      msg.threadId !== currentSession.id
    )
      score += 4.0;
    if (msg.agentName === currentSession.specialist) score += 1.5;
    if (
      msg.interactionType === 'delegation_request' &&
      currentSession.alsoSpecialist
    )
      score += 1.0;
    return score;
  }

  async dispatch(sessionId: string) {
    const dispatchRunId = randomUUID();

    const lockResult = await this.taskSessionRepo
      .createQueryBuilder()
      .update(TaskSession)
      .set({
        checkoutRunId: dispatchRunId,
        executionLockedAt: new Date(),
        status: 'running',
      })
      .where('id = :id', { id: sessionId })
      .andWhere('status = :status', { status: 'pending' })
      .execute();

    if (!lockResult.affected || lockResult.affected === 0) {
      this.logger.warn(
        `Dispatch skipped for session ${sessionId} — already checked out or not pending`,
      );
      return;
    }

    const session = await this.taskSessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) return;

    const slotAcquired = await this.tenantSlot.tryAcquire(session.teamId);
    if (!slotAcquired) {
      await this.taskSessionRepo.update(sessionId, {
        status: 'pending',
        checkoutRunId: null,
        executionLockedAt: null,
      });
      this.salesGateway.emitTaskProgress({
        sessionId: session.id,
        tenantId: session.teamId,
        userId: session.userId,
        step: 'queued',
        stepIndex: 0,
        totalSteps: 6,
        agentName: 'Abigail',
        status: 'queued',
        message: 'Another task is running. Your task is queued.',
      });
      throw new Error(
        `Tenant slot busy for session ${sessionId}; requeue for retry`,
      );
    }

    this.agentChat.emit({
      tenantId: session.teamId,
      projectId: session.projectId,
      threadId: session.id,
      fromAgent: 'abigail-mind',
      domain: 'abigail',
      interactionType: 'job_started',
      content: `Received task ${session.id}, assembling team.`,
    });

    const sandbox = await this.sandboxService.create(
      session.id,
      session.projectId,
      session.specialist,
    );
    await this.hookEngine.run('beforeDispatch', this.buildHookCtx(session));
    await this.hookEngine.run('beforeAgentRun', this.buildHookCtx(session));

    try {
      await this.dispatchEngine.run(session);

      // If the specialist escalated to needs_human, schedule the first auto-retry in 5 minutes.
      if (session.status === 'needs_human' && session.retryCount === 0) {
        await this.taskSessionRepo.update(session.id, {
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
        });
      }

      // Generate follow-up suggestions and emit as a separate event (non-blocking)
      this.generateFollowUps(session).catch(() => {});
    } catch (error) {
      await this.hookEngine
        .run(
          'onError',
          this.buildHookCtx(session, {
            errorMessage: (error as Error).message,
          }),
        )
        .catch(() => undefined);
      this.logger.error(
        `Error in session ${sessionId}: ${error.message || error}`,
        error.stack,
      );
    } finally {
      await this.hookEngine.run(
        'afterAgentRun',
        this.buildHookCtx(session, {
          result: session?.result ?? '',
        }),
      );
      await this.sandboxService.destroy(sessionId);
      await this.hookEngine.run(
        'afterDispatch',
        this.buildHookCtx(session, {
          result: session?.result ?? '',
        }),
      );
      await this.tenantSlot.release(session.teamId);
    }
  }

  private async generateFollowUps(session: any): Promise<void> {
    const userMsg = session.message ?? '';
    const result = session.result ?? '';
    if (!userMsg || !result) return;

    try {
      const model = this.aiRouter.getModel('chat');
      const { text } = await generateText({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Output exactly 3 short follow-up questions or next actions (≤60 chars each) as a JSON array of strings. No preamble, no markdown.',
          },
          {
            role: 'user',
            content: `User asked: ${userMsg.slice(0, 200)}\nAI responded: ${result.slice(0, 400)}`,
          },
        ],
      });

      let followUps: string[] = [];
      try {
        const parsed = JSON.parse(text.trim());
        if (Array.isArray(parsed)) followUps = parsed.slice(0, 3).map(String);
      } catch {
        return;
      }

      if (followUps.length === 0) return;

      this.agentChat.emit({
        tenantId: session.teamId,
        projectId: session.projectId,
        threadId: session.id,
        fromAgent: 'abigail-mind',
        domain: 'abigail',
        interactionType: 'follow_ups_ready',
        content: '',
        metadata: { followUps },
      });
    } catch {
      // Non-fatal — follow-up generation is best-effort
    }
  }

  // Exponential backoff: 5 min → 15 min → 45 min (3^n × 5min)
  private retryBackoffMs(retryCount: number): number {
    return 5 * 60 * 1000 * Math.pow(3, retryCount);
  }

  @Cron('*/5 * * * *')
  async retryStuckSessions(): Promise<void> {
    const now = new Date();
    // Cap at retryCount < 3 directly in the query to avoid loading rows we will immediately skip.
    // Note: tenant_id is not filtered here intentionally — this cron recovers sessions
    // across all tenants but only those that have not exceeded the retry ceiling.
    const stuck = await this.taskSessionRepo
      .createQueryBuilder('s')
      .select([
        's.id',
        's.teamId',
        's.userId',
        's.projectId',
        's.retryCount',
        's.nextRetryAt',
        's.specialist',
      ])
      .where('s.status = :status', { status: 'needs_human' })
      .andWhere('s.retry_count < :max', { max: 3 })
      .getMany();

    for (const session of stuck) {
      if (session.retryCount >= 3) continue;
      if (!session.nextRetryAt || session.nextRetryAt > now) continue;

      const newRetryCount = session.retryCount + 1;
      await this.taskSessionRepo.update(session.id, {
        status: 'pending',
        retryCount: newRetryCount,
        nextRetryAt: new Date(
          now.getTime() + this.retryBackoffMs(newRetryCount),
        ),
        checkoutRunId: null,
        executionLockedAt: null,
      });

      this.logger.log(
        `[RetryStuck] Auto-retrying session ${session.id} (attempt ${newRetryCount}/3)`,
      );
      this.workflowQueue
        .startSession({
          sessionId: session.id,
          tenantId: session.teamId,
          userId: session.userId,
        })
        .catch((err) =>
          this.logger.error(
            `Failed to enqueue stuck session ${session.id}`,
            err,
          ),
        );
    }
  }

  async autoDispatchTceTasks(params: {
    projectId: string;
    teamId: string;
    userId: string;
    team: string;
  }): Promise<void> {
    return this.taskSeed.autoDispatchTceTasks(params);
  }

  async processSuggestion(params: {
    projectId: string;
    tenantId: string;
    userId: string;
    suggestion: string;
  }): Promise<void> {
    return this.taskSeed.processSuggestion(params);
  }
}
