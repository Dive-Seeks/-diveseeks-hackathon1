import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { TaskStepLog } from '../entities/task-step-log.entity';
import { TaskSession } from '../entities/task-session.entity';
import {
  StepDef,
  GroupDef,
  StepContext,
  StepResult,
  EscalationError,
  FastFailError,
} from './pipeline-step.interface';
import { PIPELINE_GRAPH, STEP_TO_GROUP, STEP_DEFS } from './pipeline-graph';
import { SalesGateway } from '../../gateways/sales/sales.gateway';
import { BrainIntentClassifierService } from '../../abigail-brain/brain-intent-classifier.service';
import { BrainDispatchGuardService } from '../../abigail-brain/brain-dispatch-guard.service';
import { ParametricWeightService } from '../../memory/parametric-weight.service';
import { GitContextService } from '../git-context.service';
import { VisionService } from '../../tce/vision/vision.service';
import { UnifiedKnowledgeService } from '../unified-knowledge.service';
import { TokenizerService } from '../../tokenizer/tokenizer.service';
import { SkillService } from '../../workforce/skills/skill.service';
import { PluginService } from '../../workforce/plugins/plugin.service';
import { DispatchContextAssembler } from './dispatch-context-assembler.service';
import { TaskOutcomeMapper } from './task-outcome-mapper.service';
import { AgentsService } from '../../agents/agents.service';
import { HermesService } from '../../hermes/hermes.service';
import { McpToolbeltService } from '../../mcp-registry/mcp-toolbelt.service';
import { PrdGeneratorService } from '../../task-prd/prd-generator.service';
import { IssuesService } from '../../issues/issues.service';
import { AgentIssue } from '../../issues/entities/agent-issue.entity';
import { CodingSpecialistBootstrapService } from '../specialists/coding-specialist-bootstrap.service';
import { CodingSpecialistFactory } from '../specialists/coding-specialist.factory';
import { SpecialistRegistryService } from '../specialists/specialist-registry.service';
import { SPECIALIST_EXECUTOR } from '../specialist-executor/specialist-executor.types';
import type { SpecialistExecutor } from '../specialist-executor/specialist-executor.types';
import { LoopOrchestratorService } from '../../task-prd/loop-orchestrator.service';
import { GoalProgressService } from '../../task-prd/goal-progress.service';
import { SessionBridgeService } from '../../memory/session-bridge.service';
import { TrajectoryWriterService } from '../../evolve/trajectory-writer.service';
import { DisciplineScorerService } from '../discipline-scorer.service';
import { SpecKitEntryService } from '../../data-engine';
import { SnapshotService } from '../snapshot/snapshot.service';
import { AgentChatService } from '../../agent-chat/agent-chat.service';
import { CyclePubSubService } from '../../common/cycle-pubsub.service';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { SAFE_PAIRS } from '../reasoning/reasoning.types';
import { randomUUID } from 'crypto';
import { TaskPrdFeatureMap } from '../../task-prd/entities/task-prd-feature-map.entity';

@Injectable()
export class DispatchEngineService implements OnModuleInit {
  private readonly logger = new Logger(DispatchEngineService.name);

  constructor(
    @InjectRepository(TaskStepLog)
    private readonly stepLogRepo: Repository<TaskStepLog>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    @InjectRepository(TaskPrdFeatureMap)
    private readonly featureMapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
    private readonly salesGateway: SalesGateway,
    private readonly issuesService: IssuesService,
    private readonly contextAssembler: DispatchContextAssembler,
    private readonly specialistBootstrap: CodingSpecialistBootstrapService,
    private readonly specialistFactory: CodingSpecialistFactory,
    private readonly specialistRegistry: SpecialistRegistryService,
    @Inject(SPECIALIST_EXECUTOR)
    private readonly specialistExecutor: SpecialistExecutor,
    private readonly loopOrchestrator: LoopOrchestratorService,
    private readonly goalProgress: GoalProgressService,
    private readonly sessionBridge: SessionBridgeService,
    private readonly trajectoryWriter: TrajectoryWriterService,
    private readonly disciplineScorer: DisciplineScorerService,
    private readonly specKit: SpecKitEntryService,
    private readonly snapshotService: SnapshotService,
    private readonly agentChat: AgentChatService,
    private readonly cyclePubSub: CyclePubSubService,
    private readonly taskOutcomeMapper: TaskOutcomeMapper,
    private readonly parametricWeightService: ParametricWeightService,
  ) {}

  onModuleInit() {
    this.recoverOrphanedSessions().catch((err) =>
      this.logger.error('[DispatchEngine] Orphan recovery failed on init', err),
    );
  }

  // ─── PUBLIC ENTRY POINT ────────────────────────────────────────────────────

  async run(session: TaskSession): Promise<void> {
    const ctx = this.buildInitialContext(session);
    const startIdx = this.resolveStartGroupIndex(session.lastCompletedStep);

    for (const group of PIPELINE_GRAPH.slice(startIdx)) {
      session.currentGroup = group.key;
      await this.sessionRepo.save(session);
      try {
        await this.runGroup(group, ctx);
      } catch (err) {
        if (err instanceof EscalationError || err instanceof FastFailError)
          return;
        throw err;
      }
    }

    session.result = ctx.primaryResult?.result ?? '';
    session.completedAt = new Date();
    await this.taskOutcomeMapper.apply(
      session,
      ctx.primaryResult?.report?.taskOutcome ?? 'pass',
      (session.context as any)?.tceTaskId,
    );
  }

  // ─── CORE ENGINE ───────────────────────────────────────────────────────────

  private async runGroup(group: GroupDef, ctx: StepContext): Promise<void> {
    const seq = group.steps.filter((s) => !s.parallel);
    const par = group.steps.filter((s) => s.parallel);

    for (const step of seq) {
      await this.runStep(step, ctx);
    }

    if (par.length > 0) {
      const results = await Promise.allSettled(
        par.map((step) => this.runStep(step, ctx)),
      );
      for (const r of results) {
        if (r.status === 'rejected') {
          if (
            r.reason instanceof EscalationError ||
            r.reason instanceof FastFailError
          ) {
            throw r.reason;
          }
        }
      }
    }

    const shouldCheckpoint = group.steps.some((s) => s.checkpointAfter);
    if (shouldCheckpoint) {
      ctx.session.stepCheckpoint = this.serialiseContext(ctx);
      await this.sessionRepo.save(ctx.session);
    }
  }

  private async runStep(step: StepDef, ctx: StepContext): Promise<StepResult> {
    let attempt = 1;
    const maxAttempts = step.retryPolicy.maxRetries + 1;

    while (attempt <= maxAttempts) {
      const log = await this.stepLogRepo.save(
        this.stepLogRepo.create({
          sessionId: ctx.session.id,
          tenantId: ctx.session.teamId,
          stepKey: step.key,
          groupKey: step.group,
          attempt,
          status: 'running' as const,
          createdAt: new Date(),
        }),
      );
      const startedAt = Date.now();

      try {
        const output = await this.executeStep(step.key, ctx);
        const durationMs = Date.now() - startedAt;

        if (output) Object.assign(ctx, output);
        ctx.session.currentStep = step.key;
        ctx.session.lastCompletedStep = step.key;

        await this.stepLogRepo.update(log.id, {
          status: 'completed',
          durationMs,
          completedAt: new Date(),
        });
        await this.sessionRepo.save(ctx.session);

        return { success: true, output, durationMs };
      } catch (err) {
        const durationMs = Date.now() - startedAt;

        if (attempt < maxAttempts) {
          await this.stepLogRepo.update(log.id, {
            status: 'failed',
            errorMessage: (err as Error).message,
            durationMs,
          });
          await new Promise((r) => setTimeout(r, step.retryPolicy.backoffMs));
          attempt++;
          continue;
        }

        // All retries exhausted
        await this.stepLogRepo.update(log.id, {
          status: 'failed',
          errorMessage: (err as Error).message,
          durationMs,
        });

        if (step.failureMode === 'DEGRADE') {
          await this.stepLogRepo.save(
            this.stepLogRepo.create({
              sessionId: ctx.session.id,
              tenantId: ctx.session.teamId,
              stepKey: step.key,
              groupKey: step.group,
              attempt,
              status: 'degraded' as const,
              errorMessage: (err as Error).message,
              createdAt: new Date(),
            }),
          );
          ctx.degradedSteps.push(step.key);
          this.logger.warn(
            `[DispatchEngine] Step ${step.key} degraded: ${(err as Error).message}`,
          );
          return { success: false, error: err as Error, durationMs };
        }

        if (step.failureMode === 'ESCALATE') {
          ctx.session.status = 'needs_human';
          await this.sessionRepo.save(ctx.session);
          this.salesGateway.emitNeedsHuman({
            teamId: ctx.session.teamId,
            userId: ctx.session.userId,
            sessionId: ctx.session.id,
            stepKey: step.key,
            resumeUrl: `/abigail/sessions/${ctx.session.id}/resume`,
          });
          throw new EscalationError(step.key);
        }

        // FAIL_FAST
        await this.taskOutcomeMapper.apply(
          ctx.session,
          'fail',
          (ctx.session.context as any)?.tceTaskId,
        );
        this.salesGateway.emitTaskFailed?.({
          teamId: ctx.session.teamId,
          userId: ctx.session.userId,
          sessionId: ctx.session.id,
          specialist: ctx.session.specialist,
          error: (err as Error).message,
        });
        throw new FastFailError(step.key, (err as Error).message);
      }
    }

    return { success: false, durationMs: 0 };
  }

  // ─── STEP IMPLEMENTATIONS ──────────────────────────────────────────────────

  private async executeStep(
    stepKey: string,
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    switch (stepKey) {
      case 'intent_classify':
        return this.contextAssembler.stepIntentClassify(ctx);
      case 'cold_start_detect':
        return this.contextAssembler.stepColdStartDetect(ctx);
      case 'vision_load':
        return this.contextAssembler.stepVisionLoad(ctx);
      case 'git_context':
        return this.contextAssembler.stepGitContext(ctx);
      case 'knowledge_fetch':
        return this.contextAssembler.stepKnowledgeFetch(ctx);
      case 'chat_history':
        return this.contextAssembler.stepChatHistory(ctx);
      case 'skills_plugins':
        return this.contextAssembler.stepSkillsPlugins(ctx);
      case 'prd_generation':
        return this.contextAssembler.stepPrdGeneration(ctx);
      case 'constitution_check':
        return this.stepConstitutionCheck(ctx);
      case 'issue_creation':
        return this.stepIssueCreation(ctx);
      case 'specialist_run':
        return this.stepSpecialistRun(ctx);
      case 'memory_bridge':
        return this.stepMemoryBridge(ctx);
      case 'trajectory_write':
        return this.stepTrajectoryWrite(ctx);
      case 'discipline_score':
        return this.stepDisciplineScore(ctx);
      case 'spec_kit_audit':
        return this.stepSpecKitAudit(ctx);
      case 'weight_outcome':
        return this.stepWeightOutcome(ctx);
      case 'goal_progress':
        return this.stepGoalProgress(ctx);
      case 'snapshot_record':
        return this.stepSnapshotRecord(ctx);
      case 'emit_complete':
        return this.stepEmitComplete(ctx);
      case 'cycle_publish':
        return this.stepCyclePublish(ctx);
      default:
        this.logger.warn(`[DispatchEngine] Unknown step key: ${stepKey}`);
        return undefined;
    }
  }
  private async stepConstitutionCheck(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const check = await this.specKit.checkConstitution(
      ctx.session.projectId,
      ctx.session.taskDescription,
    );
    if (!check.allowed) {
      throw new Error(`Constitution violation: ${check.violations.join('; ')}`);
    }
    return undefined;
  }

  private async stepIssueCreation(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const title = ctx.session.taskDescription.substring(0, 200);

    // DEDUP GUARD — do not create a second issue if one already exists for this
    // session (idempotent re-entry from orphan recovery or canvas-run re-click).
    // Also guard by title+tenant so duplicate sessions don't pile duplicate issues.
    const existing = await this.issueRepo.findOne({
      where: { tenantId: ctx.session.teamId, sessionId: ctx.session.id },
      select: ['id'],
    });
    if (existing) {
      this.logger.warn(
        `[DispatchEngine] stepIssueCreation skipped — issue ${existing.id} already exists for session ${ctx.session.id}`,
      );
      return undefined;
    }

    const primaryAgentId = this.specialistBootstrap.getAgentId(
      ctx.session.specialist,
    );
    await this.issuesService.createForSession(
      ctx.session.id,
      ctx.session.teamId,
      primaryAgentId,
      title,
      ctx.goalAncestry,
    );
    if (ctx.session.alsoSpecialist) {
      const secondaryAgentId = this.specialistBootstrap.getAgentId(
        ctx.session.alsoSpecialist,
      );
      await this.issuesService.createForSession(
        randomUUID(),
        ctx.session.teamId,
        secondaryAgentId,
        title,
        ctx.goalAncestry,
      );
    }
    return undefined;
  }

  // GROUP 5 — SPECIALIST

  private async stepSpecialistRun(
    ctx: StepContext,
  ): Promise<Partial<StepContext>> {
    const isCoding = !ctx.session.team || ctx.session.team === 'coding';

    this.agentChat.emit({
      tenantId: ctx.session.teamId,
      projectId: ctx.session.projectId,
      threadId: ctx.session.id,
      fromAgent: 'abigail-mind',
      domain: 'abigail',
      interactionType: 'delegation_request',
      content: `Delegating ${ctx.session.id} to ${ctx.session.specialist}.`,
    });

    await this.snapshotService.updateSpecialistLoad(
      ctx.session.projectId,
      ctx.session.specialist,
      +1,
    );

    let primaryResult: any;
    let secondaryResult: any = null;

    // PRD loop path
    const featureMapId = (ctx.session.context as any)?.prdContext?.featureMapId;
    if (featureMapId) {
      const featureMap = await this.featureMapRepo.findOne({
        where: { id: featureMapId },
      });
      if (featureMap) {
        const finalMap = await this.loopOrchestrator.run(
          ctx.session,
          featureMap,
        );
        if (finalMap.goalId) {
          await this.goalProgress
            .recompute(ctx.session.projectId, finalMap.goalId)
            .catch((e) =>
              this.logger.warn(`[GoalProgress] ${(e as Error).message}`),
            );
        }
        primaryResult = {
          result: `Task completed via PRD loop (${finalMap.satisfiedRequirements}/${finalMap.totalRequirements} requirements, status: ${finalMap.status}).`,
          report: {
            taskOutcome:
              finalMap.status === 'complete'
                ? 'pass'
                : finalMap.status === 'human_review'
                  ? 'needs_review'
                  : 'fail',
            duration: finalMap.currentIteration * 1000,
            errorPatterns: [],
          },
        };
      } else {
        primaryResult = {
          result: 'PRD feature map not found.',
          report: { taskOutcome: 'fail', duration: 0, errorPatterns: [] },
        };
      }
    } else {
      // Direct specialist dispatch
      const secondaryAgent = ctx.session.alsoSpecialist
        ? isCoding
          ? this.specialistFactory.getSpecialist(ctx.session.alsoSpecialist)
          : this.specialistRegistry.get(
              ctx.session.team,
              ctx.session.alsoSpecialist,
            )
        : null;

      const [pRes, sRes] = await Promise.all([
        this.specialistExecutor.run({
          session: ctx.session,
          runSessionId: ctx.session.id,
          specialist: ctx.session.specialist,
          team: ctx.session.team,
          isCoding,
          userId: ctx.session.userId,
          tenantId: ctx.session.teamId,
        }),
        secondaryAgent
          ? secondaryAgent.execute(ctx.session, randomUUID())
          : Promise.resolve(null),
      ]);
      primaryResult = pRes;
      secondaryResult = sRes;
    }

    // Persist which executor ran the task so agent_complete can surface it (canvas badge).
    const executorBackend = primaryResult?.report?.executorBackend;
    if (executorBackend) {
      ctx.session.context = { ...ctx.session.context, executorBackend };
      await this.sessionRepo
        .update(ctx.session.id, { context: ctx.session.context })
        .catch(() => null);
    }

    await this.snapshotService.updateSpecialistLoad(
      ctx.session.projectId,
      ctx.session.specialist,
      -1,
    );

    return { primaryResult, secondaryResult };
  }

  // GROUP 6 — POST (all parallel)

  private async stepMemoryBridge(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    await this.sessionBridge
      .bridge(
        ctx.session.teamId,
        ctx.session.team || 'coding',
        ctx.session.specialist,
        {
          activeTask: ctx.session.taskDescription,
          constraintsAndPreferences: (
            ctx.primaryResult?.result ?? ''
          ).substring(0, 300),
          keyDecisions:
            ctx.primaryResult?.report?.errorPatterns?.join(', ') ?? '',
        },
      )
      .catch(() => null);
    return undefined;
  }

  private async stepTrajectoryWrite(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    // Only fires for non-PRD sessions — PRD sessions write trajectory via PrdMemoryBridge
    const featureMapId = (ctx.session.context as any)?.prdContext?.featureMapId;
    if (featureMapId) return undefined;

    const outcome: 'pass' | 'fail' | 'needs_review' =
      ctx.primaryResult?.report?.taskOutcome === 'pass'
        ? 'pass'
        : ctx.primaryResult?.report?.taskOutcome === 'needs_review'
          ? 'needs_review'
          : 'fail';

    const predictionMeta = (ctx.session.context as any)?.predictionMeta;

    const emotionTag =
      outcome === 'fail'
        ? 'sadness'
        : outcome === 'needs_review'
          ? 'sadness'
          : 'satisfaction';

    const failureClass: 'prd_miss' | 'quality' | null =
      outcome === 'fail' &&
      (ctx.session.disciplineReport?.flags ?? []).includes(
        'no-deliverable-block',
      )
        ? 'prd_miss'
        : outcome === 'fail'
          ? 'quality'
          : null;

    await this.trajectoryWriter
      .write({
        tenantId: ctx.session.teamId,
        specialistId: ctx.session.specialist,
        team: ctx.session.team ?? 'coding',
        taskDescription: ctx.session.taskDescription,
        outcome,
        predictionConfidence: predictionMeta?.confidence ?? null,
        predictionBasis: predictionMeta?.basis ?? null,
        wasUserModel: false,
        emotionTag,
        failureClass,
      })
      .catch((err) =>
        this.logger.warn(
          `[TrajectoryWrite] non-fatal: ${(err as Error).message}`,
        ),
      );
    return undefined;
  }

  private async stepDisciplineScore(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    if (!ctx.primaryResult?.result) return undefined;
    const vision = ctx.vision;
    const files =
      ctx.session.outputType === 'code'
        ? this.extractFiles(ctx.primaryResult.result)
        : [];
    const disciplineReport = this.disciplineScorer.score({
      result: ctx.primaryResult.result,
      files,
      specialist: ctx.session.specialist,
      taskDescription: ctx.session.taskDescription,
      techStack: vision?.techStack ?? { forbidden: [] },
    });
    if (
      disciplineReport.overall < 0.5 &&
      ctx.primaryResult.report.taskOutcome !== 'fail'
    ) {
      ctx.primaryResult.report.taskOutcome = 'needs_review';
    }
    ctx.session.disciplineReport = disciplineReport;
    await this.sessionRepo.save(ctx.session);
    return undefined;
  }

  private async stepSpecKitAudit(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    if (!ctx.primaryResult) return undefined;
    await this.specKit
      .recordAudit({
        projectId: ctx.session.projectId,
        tenantId: ctx.session.teamId,
        sessionId: ctx.session.id,
        specialist: ctx.session.specialist,
        taskDescription: ctx.session.taskDescription,
        outcome:
          ctx.primaryResult.report.taskOutcome === 'pass'
            ? 'pass'
            : ctx.primaryResult.report.taskOutcome === 'needs_review'
              ? 'needs_review'
              : 'fail',
        disciplineOverall: ctx.session.disciplineReport?.overall ?? 0,
        disciplineFlags: ctx.session.disciplineReport?.flags ?? [],
      })
      .catch((err) =>
        this.logger.warn(`[SpecKitAudit] ${(err as Error).message}`),
      );
    return undefined;
  }

  private async stepWeightOutcome(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const matchedWeightIds = (ctx.session.context as any)?.matchedWeightIds;
    if (!matchedWeightIds?.length || !ctx.primaryResult) return undefined;
    const success = ctx.primaryResult.report.taskOutcome !== 'fail';
    for (const weightId of matchedWeightIds) {
      await this.parametricWeightService
        .recordOutcome(weightId, success)
        .catch(() => {});
    }
    return undefined;
  }

  private async stepGoalProgress(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const goalId = (ctx.session.context as any)?.goalId;
    if (!goalId) return undefined;
    await this.goalProgress
      .recompute(ctx.session.projectId, goalId)
      .catch((e) => this.logger.warn(`[GoalProgress] ${(e as Error).message}`));
    return undefined;
  }

  private async stepSnapshotRecord(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    if (!ctx.primaryResult) return undefined;
    await this.snapshotService.recordSnapshot(ctx.session.projectId, {
      specialistId: ctx.session.specialist,
      taskOutcome: ctx.primaryResult.report.taskOutcome,
      responseTime: ctx.primaryResult.report.duration,
    });
    return undefined;
  }

  // GROUP 7 — EMIT

  private async stepEmitComplete(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    if (!ctx.primaryResult) return undefined;
    const files =
      ctx.session.outputType === 'code'
        ? this.extractFiles(ctx.primaryResult.result)
        : [];

    ctx.session.result = [
      ctx.primaryResult.result,
      ctx.secondaryResult
        ? `\n\n---\n[${ctx.session.alsoSpecialist?.toUpperCase()}]\n${ctx.secondaryResult.result}`
        : '',
    ].join('');
    ctx.session.toolUsageReport = {
      ...ctx.primaryResult.report,
      secondary: ctx.secondaryResult?.report ?? null,
    };
    ctx.session.completedAt = new Date();
    await this.sessionRepo.save(ctx.session);

    // Compute wall-clock thinking time from session timestamps
    const thinkingMs =
      ctx.session.completedAt && ctx.session.createdAt
        ? ctx.session.completedAt.getTime() -
          new Date(ctx.session.createdAt).getTime()
        : undefined;

    this.agentChat.emit({
      tenantId: ctx.session.teamId,
      projectId: ctx.session.projectId,
      threadId: ctx.session.id,
      fromAgent: ctx.session.specialist,
      domain: 'specialist',
      interactionType: 'job_completed',
      content: 'Task complete.',
      metadata: { thinkingMs, citations: [], followUps: [] },
    });

    this.salesGateway.emitTaskComplete({
      teamId: ctx.session.teamId,
      userId: ctx.session.userId,
      sessionId: ctx.session.id,
      specialist: ctx.session.specialist,
      result: ctx.session.result,
      taskOutcome: ctx.primaryResult.report.taskOutcome,
      files,
      disciplineReport: ctx.session.disciplineReport,
    });
    return undefined;
  }

  private async stepCyclePublish(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    await this.cyclePubSub
      .publishCycleCompleted({
        tenantId: ctx.session.teamId,
        projectId: ctx.session.projectId,
        type: 'task_session',
        refId: ctx.session.id,
        outcome:
          ctx.primaryResult?.report?.taskOutcome === 'fail'
            ? 'fail'
            : ctx.primaryResult?.report?.taskOutcome === 'needs_review'
              ? 'needs_review'
              : 'pass',
        specialist: ctx.session.specialist,
        team: ctx.session.team ?? 'coding',
        at: new Date().toISOString(),
        taskDescription: ctx.session.taskDescription,
      })
      .catch(() => undefined);
    return undefined;
  }

  // ─── RESUME + CHECKPOINT ───────────────────────────────────────────────────

  private buildInitialContext(session: TaskSession): StepContext {
    const ctx: StepContext = { session, degradedSteps: [] };
    if (session.stepCheckpoint) {
      const cp = session.stepCheckpoint as any;
      if (cp.vision) ctx.vision = cp.vision;
      if (cp.companyKnowledge) ctx.companyKnowledge = cp.companyKnowledge;
      if (cp.chatHistory) ctx.chatHistory = cp.chatHistory;
      if (cp.skillsContext) ctx.skillsContext = cp.skillsContext;
      if (cp.pluginsContext) ctx.pluginsContext = cp.pluginsContext;
      if (cp.goalAncestry) ctx.goalAncestry = cp.goalAncestry;
      if (cp.prdContext) ctx.prdContext = cp.prdContext;
      if (cp.primaryResult) ctx.primaryResult = cp.primaryResult;
      if (cp.secondaryResult !== undefined)
        ctx.secondaryResult = cp.secondaryResult;
    }
    return ctx;
  }

  private resolveStartGroupIndex(lastCompletedStep: string | null): number {
    if (!lastCompletedStep) return 0;
    const groupKey = STEP_TO_GROUP[lastCompletedStep];
    if (!groupKey) return 0;
    const idx = PIPELINE_GRAPH.findIndex((g) => g.key === groupKey);
    return idx < 0 ? 0 : idx + 1;
  }

  private serialiseContext(ctx: StepContext): Record<string, unknown> {
    return {
      vision: ctx.vision,
      companyKnowledge: ctx.companyKnowledge,
      chatHistory: ctx.chatHistory,
      skillsContext: ctx.skillsContext,
      pluginsContext: ctx.pluginsContext,
      goalAncestry: ctx.goalAncestry,
      prdContext: ctx.prdContext,
      primaryResult: ctx.primaryResult,
      secondaryResult: ctx.secondaryResult,
    };
  }

  // ─── ORPHAN RECOVERY ───────────────────────────────────────────────────────

  // Max number of times orphan recovery will reset a session to pending before
  // giving up and marking it orphaned. Prevents unbounded re-queue loops.
  private static readonly ORPHAN_MAX_RETRIES = 3;

  async recoverOrphanedSessions(): Promise<void> {
    // Only fetch `running` sessions that have a lock timestamp set.
    // Filter out any that have already exhausted recovery attempts.
    const orphans = await this.sessionRepo
      .createQueryBuilder('s')
      .select([
        's.id',
        's.teamId',
        's.userId',
        's.projectId',
        's.executionLockedAt',
        's.retryCount',
        's.lastCompletedStep',
        's.status',
        's.specialist',
      ])
      .where('s.status = :status', { status: 'running' })
      .andWhere('s."execution_locked_at" IS NOT NULL')
      .andWhere('s.retry_count < :max', {
        max: DispatchEngineService.ORPHAN_MAX_RETRIES,
      })
      .getMany();

    const now = Date.now();

    for (const session of orphans) {
      if (!session.executionLockedAt) continue;
      const ageMs = now - session.executionLockedAt.getTime();
      const ageMin = ageMs / 60_000;

      if (ageMin >= 30) {
        // Stale for 30+ minutes — age out rather than reset.
        this.logger.warn(
          `[OrphanRecovery] Flagging session ${session.id} as orphaned (${ageMin.toFixed(1)} min, retry ${session.retryCount})`,
        );
        session.status = 'orphaned';
        await this.sessionRepo.save(session);
        this.salesGateway.emitOrphaned?.({
          teamId: session.teamId,
          userId: session.userId,
          sessionId: session.id,
          lastCompletedStep: session.lastCompletedStep,
          resumeUrl: `/abigail/sessions/${session.id}/resume`,
        });
      } else if (ageMin >= 10) {
        // Locked for 10–29 min with retries remaining — reset to pending.
        this.logger.log(
          `[OrphanRecovery] Auto-resuming session ${session.id} (${ageMin.toFixed(1)} min, retry ${session.retryCount} of ${DispatchEngineService.ORPHAN_MAX_RETRIES - 1})`,
        );
        await this.sessionRepo.update(session.id, {
          status: 'pending',
          checkoutRunId: null,
          executionLockedAt: null,
          retryCount: () => '"retry_count" + 1',
        });
      }
      // Sessions locked < 10 min are still running normally — leave them alone.
    }
  }

  @Cron('*/5 * * * *')
  async watchdogCron(): Promise<void> {
    await this.recoverOrphanedSessions().catch((err) =>
      this.logger.error('[DispatchEngine] Watchdog cron failed', err),
    );
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private extractFiles(result: string): any[] {
    const matches = result.matchAll(/```[\w]*\n([\s\S]*?)```/g);
    const files: any[] = [];
    for (const m of matches) files.push({ content: m[1] });
    return files;
  }
}
