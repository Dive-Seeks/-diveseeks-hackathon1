import { OnWorkerEvent, Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TenantAwareProcessor } from '../../abigail-core/tenant-aware.processor';
import { TCETask } from '../../tce/entities/tce-task.entity';
import { TaskSession } from '../entities/task-session.entity';
import { AbigailService } from '../abigail.service';
import { AbigailMindService } from '../abigail-mind.service';
import { SessionSummaryService } from '../session-summary.service';
import { SalesGateway } from '../../gateways/sales/sales.gateway';
import { TenantSlotService } from '../../common/tenant-slot/tenant-slot.service';
import {
  TEAM_DEFAULTS,
  TEAM_SPECIALISTS,
} from '../../tce/gap-analysis/goal-decomposer.service';
import { AbigailRequestDto } from '../dto/abigail-request.dto';
import { AGENT_RUN_QUEUE, AgentRunJobData } from './workflow-queue.constants';
import { ProjectLifecycleService } from '../project-lifecycle.service';
import {
  TaskSessionStatus,
  TceTaskStatus,
} from '../../common/workflow-status.types';
import { TrajectoryWriterService } from '../../evolve/trajectory-writer.service';
import { SessionBridgeService } from '../../memory/session-bridge.service';

type WorkflowCollapseReason =
  | 'specialist_failed'
  | 'no_runnable_tasks'
  | 'needs_review_pending'
  | 'max_retry_reached'
  | 'dependency_blocked'
  | 'invalid_state_transition'
  | 'missing_memory_context'
  | 'tool_failure';

type RecoveryAction =
  | 'retry_task'
  | 'retry_with_different_specialist'
  | 'ask_ceo'
  | 'mark_needs_review'
  | 'mark_blocked'
  | 'trigger_evolve_trajectory'
  | 'write_high_salience_memory';

interface RecoveryTaskState {
  taskId: string;
  title: string;
  description: string;
  specialist: string;
  status: TceTaskStatus | 'missing';
  sessionId: string | null;
  sessionStatus: TaskSessionStatus | 'cancelled' | 'missing';
  retryCount: number;
  currentStep: string | null;
  lastCompletedStep: string | null;
  result: string | null;
}

interface CollapseAnalysis {
  completedCount: number;
  needsReviewCount: number;
  blockedCount: number;
  totalCount: number;
  unresolvedTasks: RecoveryTaskState[];
  reason: WorkflowCollapseReason | null;
}

interface RecoveryPlan {
  reason: WorkflowCollapseReason;
  action: RecoveryAction;
  detail: string;
  manualReviewRequired: boolean;
  unresolvedTasks: RecoveryTaskState[];
  triggerEvolveTrajectory: boolean;
  writeHighSalienceMemory: boolean;
}

@Processor(AGENT_RUN_QUEUE, { concurrency: 5 })
export class AgentRunProcessor extends TenantAwareProcessor {
  private readonly logger = new Logger(AgentRunProcessor.name);

  constructor(
    cls: ClsService,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    private readonly abigailService: AbigailService,
    private readonly mind: AbigailMindService,
    private readonly sessionSummary: SessionSummaryService,
    private readonly gateway: SalesGateway,
    private readonly slot: TenantSlotService,
    private readonly lifecycle: ProjectLifecycleService,
    private readonly trajectoryWriter: TrajectoryWriterService,
    private readonly sessionBridge: SessionBridgeService,
  ) {
    super(cls);
  }

  async handleJob(job: Job<AgentRunJobData>): Promise<void> {
    const { projectId, team, runId, taskIds, tenantId, userId } = job.data;
    const validSet = new Set(TEAM_SPECIALISTS[team] ?? []);
    const teamDefault = TEAM_DEFAULTS[team] ?? 'quest';
    const ctx = {
      projectId,
      team,
      runId,
      tenantId: tenantId ?? '',
      userId: userId ?? '',
      validSet,
      teamDefault,
    };

    try {
      const priorProgress = await this.tceTaskRepo.count({
        where: { id: In(taskIds), status: In(['done', 'in_progress']) as any },
      });
      if (priorProgress > 0) {
        this.gateway.emitWorkflowPhase(projectId, {
          phase: 'workflow_resumed_after_interrupt',
        });
      } else {
        await this.lifecycle.startRun(tenantId ?? '', projectId);
      }
      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'coordinator_reading',
      });

      for (let i = 0; i < taskIds.length; i++) {
        await this.slot.renewProjectLock(projectId, runId);

        const haltReason = await this.slot.readHaltFlag(
          projectId,
          tenantId ?? '',
        );
        if (haltReason === 'stop') {
          this.logger.log(`[agent-run] Stop requested for project ${projectId}`);
          break;
        }
        if (haltReason === 'pause') {
          this.logger.log(
            `[agent-run] Pause requested for project ${projectId}`,
          );
          await this.lifecycle.pauseRun(tenantId ?? '', projectId);
          this.gateway.emitWorkflowPhase(projectId, {
            phase: 'workflow_paused',
          });
          await this.slot.clearHaltFlag(projectId, tenantId ?? '');
          await this.slot.unlockProjectIfOwner(projectId, runId);
          return;
        }

        await this.executeSession(ctx, taskIds[i], i + 1, taskIds.length);
      }

      await this.finish(job, false);
    } catch (err) {
      const isFinal = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isFinal) await this.finish(job, true, (err as Error)?.message);
      throw err;
    }
  }

  private async executeSession(
    ctx: {
      projectId: string;
      team: string;
      runId: string;
      tenantId: string;
      userId: string;
      validSet: Set<string>;
      teamDefault: string;
    },
    taskId: string,
    position: number,
    total: number,
  ): Promise<void> {
    const { projectId, team, tenantId, userId, validSet, teamDefault } = ctx;
    const task = await this.tceTaskRepo.findOne({ where: { id: taskId } });
    if (!task) return;
    const title = task.title ?? task.description ?? 'Task';

    if (task.status === 'done') {
      if (task.sessionId) {
        const summary = await this.sessionSummary.getSummary(
          task.sessionId,
          title,
        );
        this.gateway.emitWorkflowPhase(projectId, {
          phase: 'agent_complete',
          specialist: task.specialist,
          position,
          outcome: summary.outcome,
          summary: summary.oneLiner,
          docSection: summary.docSection,
          executorBackend: summary.executorBackend,
        });
      }
      return;
    }

    const specialist = validSet.has(task.specialist)
      ? task.specialist
      : teamDefault;
    if (specialist !== task.specialist) {
      await this.tceTaskRepo.update(task.id, { specialist } as any);
    }

    this.gateway.emitWorkflowPhase(projectId, {
      phase: 'agent_assigned',
      specialist,
      taskTitle: title,
      position,
      total,
    });

    try {
      let sessionId = task.sessionId ?? undefined;
      if (!sessionId) {
        const request: AbigailRequestDto = {
          teamId: tenantId,
          userId,
          projectId,
          message: task.description ?? title,
          specialist,
          team,
          source: 'canvas-run',
        };
        const result = (await this.abigailService.handleRequest(request)) as any;
        if (result?.status === 'accepted' && result?.sessionId) {
          sessionId = result.sessionId;
          await this.tceTaskRepo.update(task.id, {
            status: 'in_progress',
            sessionId,
          });
        } else {
          await this.tceTaskRepo.update(task.id, { status: 'blocked' });
          this.gateway.emitWorkflowPhase(projectId, {
            phase: 'agent_complete',
            specialist,
            position,
            outcome: 'blocked',
            summary: 'Could not start task',
            docSection: '',
          });
          return;
        }
      }

      await this.mind.dispatch(sessionId);

      const summary = await this.sessionSummary.getSummary(sessionId, title);
      if (summary.outcome === 'done') {
        await this.tceTaskRepo.update(task.id, { status: 'done' });
      } else if (summary.outcome === 'needs_review') {
        await this.tceTaskRepo.update(task.id, { status: 'needs_review' });
      } else {
        await this.tceTaskRepo.update(task.id, { status: 'blocked' });
      }
      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'agent_complete',
        specialist,
        position,
        outcome: summary.outcome,
        summary: summary.oneLiner,
        docSection: summary.docSection,
        executorBackend: summary.executorBackend,
      });
    } catch (err) {
      await this.tceTaskRepo.update(task.id, { status: 'blocked' });
      this.logger.error(
        `[agent-run] task ${task.id} failed: ${(err as Error)?.message}`,
      );
      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'agent_complete',
        specialist,
        position,
        outcome: 'blocked',
        summary: (err as Error)?.message ?? 'failed',
        docSection: '',
      });
    }
  }

  private async finish(
    job: Job<AgentRunJobData>,
    errored: boolean,
    errorMsg?: string,
  ): Promise<void> {
    const { projectId, runId, tenantId, taskIds, team } = job.data;
    await this.slot.clearStopFlag(projectId, tenantId ?? '');
    await this.slot.unlockProjectIfOwner(projectId, runId);
    await this.lifecycle.finishRun(tenantId ?? '', projectId);

    if (errored) {
      this.logger.error(
        `[agent-run] final failure for project ${projectId}: ${errorMsg ?? 'unknown error'}`,
      );
      return;
    }

    const analysis = await this.analyzeRun(taskIds);
    const remaining =
      taskIds.length -
      analysis.completedCount -
      analysis.needsReviewCount -
      analysis.blockedCount;
    let recoverySummary = 'No recovery needed.';

    if (analysis.reason) {
      const plan = this.buildRecoveryPlan(analysis);
      this.logger.warn(
        `[workflow-recovery] project=${projectId} reason=${plan.reason} action=${plan.action} unresolved=${plan.unresolvedTasks.length}`,
      );
      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'workflow_recovery_started',
        reason: plan.reason,
        action: plan.action,
        unresolvedCount: plan.unresolvedTasks.length,
      });
      await this.persistRecoveryArtifacts(
        tenantId ?? '',
        projectId,
        team,
        plan,
      );
      this.gateway.emitWorkflowPhase(projectId, {
        phase: 'workflow_recovery_completed',
        reason: plan.reason,
        action: plan.action,
        unresolvedCount: plan.unresolvedTasks.length,
        manualReviewRequired: plan.manualReviewRequired,
      });
      recoverySummary = [
        `Reason: ${plan.reason}`,
        `Action: ${plan.action}`,
        plan.detail,
        `Manual review required: ${plan.manualReviewRequired ? 'yes' : 'no'}`,
      ].join('\n');
    }

    const reportLines = [
      '## Completion Report',
      analysis.reason
        ? `**Workflow collapsed:** ${analysis.reason}`
        : '**Workflow completed**',
      `**${analysis.completedCount} done** - ${analysis.needsReviewCount} needs review - ${analysis.blockedCount} blocked` +
        (remaining > 0 ? ` - ${remaining} not reached` : ''),
      '',
      '### Next Recommended Actions',
      recoverySummary,
    ];
    this.gateway.emitWorkflowPhase(projectId, {
      phase: 'workflow_done',
      reportSection: reportLines.join('\n'),
      completedCount: analysis.completedCount,
      needsReviewCount: analysis.needsReviewCount,
      blockedCount: analysis.blockedCount,
      totalCount: taskIds.length,
    });
  }

  private async analyzeRun(taskIds: string[]): Promise<CollapseAnalysis> {
    if (taskIds.length === 0) {
      return {
        completedCount: 0,
        needsReviewCount: 0,
        blockedCount: 0,
        totalCount: 0,
        unresolvedTasks: [],
        reason: 'no_runnable_tasks',
      };
    }

    const tasks = await this.tceTaskRepo.find({
      where: { id: In(taskIds) },
      select: [
        'id',
        'title',
        'description',
        'specialist',
        'status',
        'sessionId',
      ],
    });
    const taskMap = new Map(tasks.map((task) => [task.id, task]));
    const sessionIds = tasks
      .map((task) => task.sessionId)
      .filter((sessionId): sessionId is string => !!sessionId);
    const sessions =
      sessionIds.length === 0
        ? []
        : await this.taskSessionRepo.find({
            where: { id: In(sessionIds) },
            select: [
              'id',
              'status',
              'retryCount',
              'currentStep',
              'lastCompletedStep',
              'result',
            ],
          });
    const sessionMap = new Map(sessions.map((session) => [session.id, session]));
    const states = taskIds.map((taskId): RecoveryTaskState => {
      const task = taskMap.get(taskId);
      if (!task) {
        return {
          taskId,
          title: 'Missing task',
          description: 'Task row not found during run finalization.',
          specialist: 'unknown',
          status: 'missing',
          sessionId: null,
          sessionStatus: 'missing',
          retryCount: 0,
          currentStep: null,
          lastCompletedStep: null,
          result: null,
        };
      }

      const session = task.sessionId ? sessionMap.get(task.sessionId) : null;
      return {
        taskId: task.id,
        title: task.title ?? task.description ?? 'Task',
        description: task.description ?? task.title ?? 'Task',
        specialist: task.specialist,
        status: task.status,
        sessionId: task.sessionId ?? null,
        sessionStatus: session?.status ?? 'missing',
        retryCount: session?.retryCount ?? 0,
        currentStep: session?.currentStep ?? null,
        lastCompletedStep: session?.lastCompletedStep ?? null,
        result: session?.result ?? null,
      };
    });

    const completedCount = states.filter((state) => state.status === 'done').length;
    const needsReviewCount = states.filter(
      (state) => state.status === 'needs_review',
    ).length;
    const blockedCount = states.filter((state) => state.status === 'blocked').length;
    const unresolvedTasks = states.filter((state) => state.status !== 'done');

    return {
      completedCount,
      needsReviewCount,
      blockedCount,
      totalCount: taskIds.length,
      unresolvedTasks,
      reason: this.classifyCollapseReason(unresolvedTasks),
    };
  }

  private classifyCollapseReason(
    unresolvedTasks: RecoveryTaskState[],
  ): WorkflowCollapseReason | null {
    if (unresolvedTasks.length === 0) return null;
    if (unresolvedTasks.every((task) => task.status === 'missing')) {
      return 'invalid_state_transition';
    }
    if (unresolvedTasks.some((task) => task.status === 'needs_review')) {
      return 'needs_review_pending';
    }
    if (unresolvedTasks.some((task) => task.status === 'queued')) {
      return 'no_runnable_tasks';
    }
    if (
      unresolvedTasks.some(
        (task) =>
          task.currentStep?.includes('tool') ||
          task.result?.toLowerCase().includes('tool'),
      )
    ) {
      return 'tool_failure';
    }
    if (
      unresolvedTasks.some(
        (task) => task.sessionStatus === 'failed' && task.retryCount >= 3,
      )
    ) {
      return 'max_retry_reached';
    }
    if (
      unresolvedTasks.some(
        (task) =>
          task.sessionStatus === 'missing' && task.status === 'in_progress',
      )
    ) {
      return 'invalid_state_transition';
    }
    if (unresolvedTasks.some((task) => task.sessionStatus === 'orphaned')) {
      return 'dependency_blocked';
    }
    if (
      unresolvedTasks.some(
        (task) =>
          task.result?.toLowerCase().includes('memory context') ||
          task.result?.toLowerCase().includes('missing memory'),
      )
    ) {
      return 'missing_memory_context';
    }
    if (
      unresolvedTasks.some(
        (task) => task.status === 'blocked' || task.sessionStatus === 'failed',
      )
    ) {
      return 'specialist_failed';
    }
    return 'dependency_blocked';
  }

  private buildRecoveryPlan(analysis: CollapseAnalysis): RecoveryPlan {
    const unresolvedTasks = analysis.unresolvedTasks;
    const reason = analysis.reason ?? 'dependency_blocked';

    switch (reason) {
      case 'needs_review_pending':
        return {
          reason,
          action: 'mark_needs_review',
          detail:
            'Tasks completed with review-required outcomes and must wait for explicit CEO or human review before the next run.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'tool_failure':
        return {
          reason,
          action: 'retry_task',
          detail:
            'A task stopped during a tool-dependent step and should only be retried after the tool failure is reviewed.',
          manualReviewRequired: false,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'missing_memory_context':
        return {
          reason,
          action: 'retry_task',
          detail:
            'A task appears to have failed with missing memory context and should be retried after memory context is rebuilt.',
          manualReviewRequired: false,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'specialist_failed':
        return {
          reason,
          action: 'retry_with_different_specialist',
          detail:
            'A specialist failed and the next safe action is a reviewed rerun with an alternate specialist assignment.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'max_retry_reached':
        return {
          reason,
          action: 'mark_blocked',
          detail:
            'The session exhausted its retry budget and must stay blocked until the CEO or a human resolves the underlying issue.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'invalid_state_transition':
        return {
          reason,
          action: 'ask_ceo',
          detail:
            'The workflow ended in an invalid mixed state and needs CEO review before any more dispatch occurs.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
      case 'no_runnable_tasks':
        return {
          reason,
          action: 'ask_ceo',
          detail:
            'The run finished without any runnable work, so CEO review is required before the workflow can continue.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: false,
          writeHighSalienceMemory: false,
        };
      case 'dependency_blocked':
      default:
        return {
          reason,
          action: 'mark_blocked',
          detail:
            'A dependency or prior session state blocked forward progress and the workflow must remain blocked until reviewed.',
          manualReviewRequired: true,
          unresolvedTasks,
          triggerEvolveTrajectory: true,
          writeHighSalienceMemory: true,
        };
    }
  }

  private async persistRecoveryArtifacts(
    tenantId: string,
    projectId: string,
    team: string,
    plan: RecoveryPlan,
  ): Promise<void> {
    for (const task of plan.unresolvedTasks) {
      if (plan.triggerEvolveTrajectory) {
        await this.trajectoryWriter
          .write({
            tenantId,
            specialistId: task.specialist,
            team,
            taskDescription: task.description,
            outcome: task.status === 'needs_review' ? 'needs_review' : 'fail',
            emotionTag: task.status === 'needs_review' ? 'sadness' : 'fear',
            failureClass:
              task.status === 'needs_review' ? 'quality' : 'blocked',
            predictionMeta: {
              recoveryReason: plan.reason,
              recoveryAction: plan.action,
              sessionStatus: task.sessionStatus,
              retryCount: task.retryCount,
              currentStep: task.currentStep,
              lastCompletedStep: task.lastCompletedStep,
            },
          })
          .catch((err) =>
            this.logger.warn(
              `[workflow-recovery] trajectory write failed for ${task.taskId}: ${(err as Error).message}`,
            ),
          );
      }

      if (plan.writeHighSalienceMemory) {
        await this.sessionBridge
          .bridgeSpecAudit({
            tenantId,
            projectId,
            sessionId: task.sessionId ?? task.taskId,
            specialist: task.specialist,
            outcome: task.status === 'needs_review' ? 'needs_review' : 'fail',
            metCriteria: [],
            unmetCriteria: [`workflow-collapse:${plan.reason}`],
            disciplineFlags: [
              `recovery-action:${plan.action}`,
              `task-status:${task.status}`,
            ],
            iterationCount: task.retryCount + 1,
            isMaxRetry: plan.reason === 'max_retry_reached',
          })
          .catch((err) =>
            this.logger.warn(
              `[workflow-recovery] memory bridge failed for ${task.taskId}: ${(err as Error).message}`,
            ),
          );
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AgentRunJobData>, error: Error): void {
    if (job.attemptsMade + 1 < (job.opts?.attempts ?? 1)) return;

    const { projectId, taskIds } = job.data;
    this.logger.error(
      `[AgentRunProcessor] Job ${job.id} failed permanently after ${job.attemptsMade + 1} attempt(s): ${error.message}`,
    );

    this.gateway.emitWorkflowPhase(projectId, {
      phase: 'workflow_done',
      reportSection: `## Completion Report\n**Run failed:** ${error.message}`,
      completedCount: 0,
      needsReviewCount: 0,
      blockedCount: taskIds?.length ?? 0,
      totalCount: taskIds?.length ?? 0,
    });
  }
}
