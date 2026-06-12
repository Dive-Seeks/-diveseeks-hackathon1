import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';

import {
  AuditLoop,
  AuditPhase,
  AuditArtifact,
  AuditFinding,
  AuditScore,
  AuditRubric,
} from './entities/audit-loop.entity';
import { AUDIT_LOOP_QUEUE, AuditJobs } from './audit-loop.queue';
import { PromptEngineService } from '../prompt-engine/services/prompt-engine.service';
import { PlanGeneratorService } from './services/plan-generator.service';
import { WorkflowSpecGeneratorService } from './services/workflow-spec-generator.service';
import { PlanAuditorService } from './services/plan-auditor.service';
import { WorkflowAuditorService } from './services/workflow-auditor.service';
import { StreamAuditorService } from './services/stream-auditor.service';
import { MistakeProcessorService } from './services/mistake-processor.service';
import { FinalAuditorService } from './services/final-auditor.service';
import { WorkflowExecutorService } from '../workflow-engine/services/workflow-executor.service';
import { MetaOptimizerService } from '../evolve/meta-optimizer.service';
import { HermesGateway } from '../hermes/hermes.gateway';
import * as crypto from 'crypto';
import { SessionBridgeService } from '../memory/session-bridge.service';
import { CyclePubSubService } from '../common/cycle-pubsub.service';
import { AgentChatService } from '../agent-chat/agent-chat.service';

const MAX_ROUNDS = 10;
const PASSING_SCORE = 9.0;

@Processor(AUDIT_LOOP_QUEUE)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(
    @InjectRepository(AuditLoop)
    private readonly loopRepo: Repository<AuditLoop>,
    @InjectRepository(AuditArtifact)
    private readonly artifactRepo: Repository<AuditArtifact>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditScore)
    private readonly scoreRepo: Repository<AuditScore>,
    @InjectRepository(AuditRubric)
    private readonly rubricRepo: Repository<AuditRubric>,
    private readonly promptEngine: PromptEngineService,
    private readonly planGenerator: PlanGeneratorService,
    private readonly workflowSpecGenerator: WorkflowSpecGeneratorService,
    private readonly planAuditor: PlanAuditorService,
    private readonly workflowAuditor: WorkflowAuditorService,
    private readonly streamAuditor: StreamAuditorService,
    private readonly mistakeProcessor: MistakeProcessorService,
    private readonly finalAuditor: FinalAuditorService,
    private readonly workflowExecutor: WorkflowExecutorService,
    private readonly metaOptimizer: MetaOptimizerService,
    private readonly sessionBridge: SessionBridgeService,
    private readonly cyclePubSub: CyclePubSubService,
    @InjectQueue(AUDIT_LOOP_QUEUE)
    private readonly auditQueue: Queue,
    @Optional() private readonly gateway?: HermesGateway,
    @Optional() private readonly agentChat?: AgentChatService,
  ) {
    super();
  }

  private emit(tenantId: string, event: string, payload: object): void {
    if (this.gateway?.server) {
      this.gateway.server.to(`tenant:${tenantId}`).emit(event, payload);
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === AuditJobs.AUDIT_STEP) {
      return this.handleAuditStep(job.data);
    }

    const { loopId, phase } = job.data;
    const loop = await this.loopRepo.findOne({ where: { id: loopId } });
    if (!loop || loop.status !== 'running') return;

    this.logger.log(
      `Audit Loop ${loopId} — Phase: ${phase} — Round: ${loop.currentRound}`,
    );

    this.emit(loop.tenantId, 'audit_loop_phase_started', {
      loopId,
      phase,
      round: loop.currentRound,
    });

    this.agentChat?.emit({
      tenantId: loop.tenantId,
      projectId: loop.workflowExecutionId || loop.id,
      threadId: loop.id,
      fromAgent: 'audit-loop',
      domain: 'system',
      interactionType: 'audit_phase',
      content: `Phase ${phase} started (round ${loop.currentRound})`,
      metadata: { phase, round: loop.currentRound },
    });

    try {
      switch (phase) {
        case AuditPhase.BRAINSTORM:
          await this.handleBrainstorm(loop);
          break;
        case AuditPhase.PLAN:
          await this.handlePlan(loop);
          break;
        case AuditPhase.PLAN_AUDIT:
          await this.handlePlanAudit(loop);
          break;
        case AuditPhase.WORKFLOW_SPEC:
          await this.handleWorkflowSpec(loop);
          break;
        case AuditPhase.WORKFLOW_AUDIT:
          await this.handleWorkflowAudit(loop);
          break;
        case AuditPhase.EXECUTING:
          await this.handleExecution(loop);
          break;
        case AuditPhase.MISTAKE_PROCESSING:
          await this.handleMistakeProcessing(loop);
          break;
        case AuditPhase.FINAL_AUDIT:
          await this.handleFinalAudit(loop);
          break;
        default:
          this.logger.warn(`Unhandled audit phase: ${phase}`);
      }
    } catch (error) {
      this.logger.error(
        `Audit phase ${phase} failed for loop ${loopId}: ${error.message}`,
        error.stack,
      );
      this.emit(loop.tenantId, 'audit_loop_error', {
        loopId,
        phase,
        error: error.message,
      });
    }
  }

  private async handleAuditStep(data: {
    loopId: string;
    round: number;
    stepKey: string;
    output: any;
    tenantId: string;
  }): Promise<void> {
    const { loopId, round, stepKey, output, tenantId } = data;

    this.logger.log(
      `[AuditProcessor] Streaming Audit for Loop ${loopId} Step ${stepKey}`,
    );

    // We don't have specialistId here yet, so we use stepKey as fallback
    const result = await this.streamAuditor.auditStepOutput(
      loopId,
      round,
      stepKey,
      'unknown',
      output,
    );

    if (result.severity !== 'none') {
      this.logger.warn(
        `[AuditProcessor] Step ${stepKey} failed streaming audit with severity ${result.severity}`,
      );
      this.emit(tenantId, 'audit_step_failed', {
        loopId,
        stepKey,
        round,
        finding: result.finding,
      });

      if (result.severity === 'high' || result.severity === 'critical') {
        // Halt workflow and trigger mistake processing immediately for high/critical
        // In a real implementation, we would pause the BullMQ queue for this workflow
        this.logger.warn(
          `[AuditProcessor] Halting workflow ${loopId} due to ${result.severity} finding`,
        );
      }
    } else {
      this.emit(tenantId, 'audit_step_passed', { loopId, stepKey, round });
    }
  }

  private async handleBrainstorm(loop: AuditLoop): Promise<void> {
    // In a real system, this might wait for a BrainSession to be completed.
    // For the loop, we ensure the BrainSession is in a good state.
    this.logger.log(`[AuditProcessor] Brainstorm Phase for loop ${loop.id}`);

    // Advance to PLAN phase
    await this.loopRepo.update(loop.id, { currentPhase: AuditPhase.PLAN });
    await this.auditQueue.add(AuditJobs.RUN_PHASE, {
      loopId: loop.id,
      phase: AuditPhase.PLAN,
    });
  }

  private async handlePlan(loop: AuditLoop): Promise<void> {
    const previousFindings = await this.findingRepo.find({
      where: { loopId: loop.id, round: loop.currentRound - 1 },
    });

    const ideationSummary = loop.originatingRequest; // Mocking ideation summary for now
    const planOutput = await this.planGenerator.generatePlan(
      ideationSummary,
      loop.originatingRequest,
    );

    const artifact = await this.artifactRepo.save(
      this.artifactRepo.create({
        loopId: loop.id,
        round: loop.currentRound,
        kind: 'plan',
        content: planOutput,
        contentHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(planOutput))
          .digest('hex'),
        frontmatter: {
          sources: [`loop:${loop.id}:round:${loop.currentRound - 1}`],
          audit_score: null,
          audit_round: loop.currentRound,
          flagged_issues: previousFindings.map((f) => f.criterion),
        },
      }),
    );

    this.emit(loop.tenantId, 'audit_artifact_created', {
      loopId: loop.id,
      artifactId: artifact.id,
      kind: artifact.kind,
      round: loop.currentRound,
    });

    await this.loopRepo.update(loop.id, {
      currentPhase: AuditPhase.PLAN_AUDIT,
    });
    await this.auditQueue.add(AuditJobs.RUN_PHASE, {
      loopId: loop.id,
      phase: AuditPhase.PLAN_AUDIT,
    });
  }

  private async handlePlanAudit(loop: AuditLoop): Promise<void> {
    const artifact = await this.artifactRepo.findOne({
      where: {
        loopId: loop.id,
        round: loop.currentRound,
        kind: In(['plan', 'corrected_plan']),
      },
      order: { createdAt: 'DESC' },
    });
    if (!artifact) throw new Error('Plan artifact not found for audit');

    const { overallScore, findings } = await this.planAuditor.auditPlan(
      loop.id,
      loop.currentRound,
      artifact.content,
      loop.tenantId,
    );

    await this.artifactRepo.update(artifact.id, {
      frontmatter: {
        ...artifact.frontmatter,
        audit_score: overallScore,
        flagged_issues: findings.map((f) => f.criterion),
      },
    });

    for (const finding of findings) {
      await this.findingRepo.save({
        ...finding,
        loopId: loop.id,
        round: loop.currentRound,
      });
    }

    this.emit(loop.tenantId, 'audit_scored', {
      loopId: loop.id,
      round: loop.currentRound,
      phase: 'plan',
      score: overallScore,
      findingsCount: findings.length,
    });

    if (overallScore >= PASSING_SCORE) {
      await this.loopRepo.update(loop.id, {
        currentPhase: AuditPhase.WORKFLOW_SPEC,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.WORKFLOW_SPEC,
      });
    } else if (overallScore >= 7.0) {
      // Tier 2: Patch plan in-place (auto-correct loop)
      this.logger.log(
        `Loop ${loop.id} plan scored ${overallScore.toFixed(1)}, auto-correcting...`,
      );
      await this.loopRepo.update(loop.id, {
        currentRound: loop.currentRound + 1,
        currentPhase: AuditPhase.PLAN,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.PLAN,
      });
    } else {
      // Tier 3: Re-open Brain session
      this.logger.warn(
        `Loop ${loop.id} plan scored < 7.0 (${overallScore.toFixed(1)}), reverting to Brainstorm`,
      );
      await this.loopRepo.update(loop.id, {
        currentRound: loop.currentRound + 1,
        currentPhase: AuditPhase.BRAINSTORM,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.BRAINSTORM,
      });
    }
  }

  private async handleWorkflowSpec(loop: AuditLoop): Promise<void> {
    const latestPlan = await this.artifactRepo.findOne({
      where: { loopId: loop.id, round: loop.currentRound },
      order: { createdAt: 'DESC' },
    });
    if (!latestPlan)
      throw new Error('Latest plan not found for workflow spec generation');

    const workflowSpec = await this.workflowSpecGenerator.generateWorkflowSpec(
      latestPlan.content,
    );

    const artifact = await this.artifactRepo.save(
      this.artifactRepo.create({
        loopId: loop.id,
        round: loop.currentRound,
        kind: 'workflow_spec',
        parentArtifactId: latestPlan.id,
        content: workflowSpec,
        contentHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(workflowSpec))
          .digest('hex'),
        frontmatter: {
          sources: [`artifact:${latestPlan.id}`],
          audit_score: null,
          audit_round: loop.currentRound,
          flagged_issues: [],
        },
      }),
    );

    this.emit(loop.tenantId, 'audit_artifact_created', {
      loopId: loop.id,
      artifactId: artifact.id,
      kind: 'workflow_spec',
      round: loop.currentRound,
    });

    await this.loopRepo.update(loop.id, {
      currentPhase: AuditPhase.WORKFLOW_AUDIT,
    });
    await this.auditQueue.add(AuditJobs.RUN_PHASE, {
      loopId: loop.id,
      phase: AuditPhase.WORKFLOW_AUDIT,
    });
  }

  private async handleWorkflowAudit(loop: AuditLoop): Promise<void> {
    const specArtifact = await this.artifactRepo.findOne({
      where: {
        loopId: loop.id,
        round: loop.currentRound,
        kind: In(['workflow_spec', 'corrected_workflow']),
      },
      order: { createdAt: 'DESC' },
    });
    if (!specArtifact)
      throw new Error('Workflow spec artifact not found for audit');

    const { overallScore, findings } = await this.workflowAuditor.auditWorkflow(
      loop.id,
      loop.currentRound,
      specArtifact.content,
      loop.tenantId,
    );

    await this.artifactRepo.update(specArtifact.id, {
      frontmatter: {
        ...specArtifact.frontmatter,
        audit_score: overallScore,
        flagged_issues: findings.map((f) => f.criterion),
      },
    });

    for (const finding of findings) {
      await this.findingRepo.save({
        ...finding,
        loopId: loop.id,
        round: loop.currentRound,
        routedTo: 're-workflow',
      });
    }

    this.emit(loop.tenantId, 'audit_scored', {
      loopId: loop.id,
      round: loop.currentRound,
      phase: 'workflow_spec',
      score: overallScore,
      findingsCount: findings.length,
    });

    if (overallScore >= PASSING_SCORE) {
      await this.loopRepo.update(loop.id, {
        currentPhase: AuditPhase.EXECUTING,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.EXECUTING,
      });
    } else if (overallScore >= 7.0) {
      // Tier 2: Patch workflow in-place
      this.logger.log(
        `Loop ${loop.id} workflow scored ${overallScore.toFixed(1)}, auto-correcting...`,
      );
      await this.loopRepo.update(loop.id, {
        currentRound: loop.currentRound + 1,
        currentPhase: AuditPhase.WORKFLOW_SPEC,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.WORKFLOW_SPEC,
      });
    } else {
      // Tier 3: Return to Plan Audit
      this.logger.warn(
        `Loop ${loop.id} workflow scored < 7.0 (${overallScore.toFixed(1)}), reverting to Plan Audit`,
      );
      await this.loopRepo.update(loop.id, {
        currentRound: loop.currentRound + 1,
        currentPhase: AuditPhase.PLAN_AUDIT,
      });
      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.PLAN_AUDIT,
      });
    }
  }

  private async handleExecution(loop: AuditLoop): Promise<void> {
    this.logger.log(
      `[AuditProcessor] Starting workflow execution for Loop ${loop.id}`,
    );

    const execution = await this.workflowExecutor.startWorkflow(
      'generic-audit-workflow',
      {
        loopId: loop.id,
        round: loop.currentRound,
        input: loop.originatingRequest,
      },
      loop.tenantId,
      loop.userId,
    );

    await this.loopRepo.update(loop.id, {
      workflowExecutionId: execution.id,
      currentPhase: AuditPhase.EXECUTING,
    });

    this.emit(loop.tenantId, 'audit_loop_executing', {
      loopId: loop.id,
      workflowExecutionId: execution.id,
    });

    // We do NOT add RUN_PHASE for MISTAKE_PROCESSING here anymore.
    // The WorkflowProcessor will trigger it when updatedExecution.status === WorkflowStatus.COMPLETED.
  }

  private async handleMistakeProcessing(loop: AuditLoop): Promise<void> {
    // Collect all findings from this loop
    const findings = await this.findingRepo.find({
      where: { loopId: loop.id },
      order: { round: 'ASC', phase: 'ASC' },
    });

    const criticalFindings = findings.filter(
      (f) => f.severity === 'high' || f.severity === 'critical',
    );

    if (criticalFindings.length > 0) {
      this.logger.log(
        `Loop ${loop.id} routing ${criticalFindings.length} critical findings to Meta-Optimizer`,
      );

      // Group findings by phase to evolve rubrics (Gap G - metaauto pattern)
      const phasesToEvolve = [...new Set(criticalFindings.map((f) => f.phase))];

      for (const phase of phasesToEvolve) {
        const rubric = await this.rubricRepo.findOne({
          where: { phase, tenantId: loop.tenantId || IsNull() },
        });
        if (rubric) {
          const phaseFindings = criticalFindings.filter(
            (f) => f.phase === phase,
          );
          const mutation = await this.metaOptimizer.suggestRubricMutation(
            phase,
            rubric.criteria,
            phaseFindings,
          );

          await this.rubricRepo.update(rubric.id, {
            criteria: mutation.suggestedCriteria,
            version: rubric.version + 1,
          });

          this.logger.log(
            `[AuditProcessor] Evolved ${phase} rubric version to ${rubric.version + 1} based on ${phaseFindings.length} findings`,
          );
        }
      }

      this.emit(loop.tenantId, 'audit_mistakes_evolved', {
        loopId: loop.id,
        criticalCount: criticalFindings.length,
        phasesEvolved: phasesToEvolve,
      });
    }

    // Bridge medium+ findings into memory + publish to the cycle stream
    for (const finding of findings) {
      await this.sessionBridge
        .bridgeAuditFinding(finding)
        .catch((err) =>
          this.logger.warn(`bridgeAuditFinding failed: ${err.message}`),
        );
    }
    await this.cyclePubSub.publishCycleCompleted({
      tenantId: loop.tenantId,
      projectId: loop.workflowExecutionId || loop.id,
      type: 'audit_round',
      refId: loop.id,
      outcome: loop.status === 'completed' ? 'pass' : 'needs_review',
      specialist: 'audit-loop',
      at: new Date().toISOString(),
    });

    this.agentChat?.emit({
      tenantId: loop.tenantId,
      projectId: loop.workflowExecutionId || loop.id,
      threadId: loop.id,
      fromAgent: 'audit-loop',
      domain: 'system',
      interactionType: 'job_completed',
      content: `Audit loop complete. Status: ${loop.status}. Final score: ${loop.finalScore ?? 'N/A'}/10`,
      metadata: { status: loop.status, finalScore: loop.finalScore },
    });

    await this.loopRepo.update(loop.id, {
      currentPhase: AuditPhase.FINAL_AUDIT,
    });
    await this.auditQueue.add(AuditJobs.RUN_PHASE, {
      loopId: loop.id,
      phase: AuditPhase.FINAL_AUDIT,
    });
  }

  private async handleFinalAudit(loop: AuditLoop): Promise<void> {
    // ... existing final audit logic ...
    const allArtifacts = await this.artifactRepo.find({
      where: { loopId: loop.id },
      order: { round: 'DESC', createdAt: 'DESC' },
    });

    const executionSummary = {
      totalRounds: loop.currentRound,
      artifacts: allArtifacts.map((a) => ({
        kind: a.kind,
        round: a.round,
        score: a.frontmatter?.audit_score ?? null,
      })),
      workflowExecutionId: loop.workflowExecutionId,
    };

    const { overallScore, findings } = await this.finalAuditor.auditFinal(
      loop.id,
      loop.currentRound,
      executionSummary,
      loop.tenantId,
    );

    const finalScore = overallScore;

    if (finalScore >= 10.0 || loop.currentRound >= MAX_ROUNDS) {
      await this.loopRepo.update(loop.id, {
        currentPhase: AuditPhase.DONE,
        status: 'completed',
        finalScore,
        completedAt: new Date(),
      });

      this.emit(loop.tenantId, 'audit_loop_completed', {
        loopId: loop.id,
        finalScore,
        totalRounds: loop.currentRound,
        converged: finalScore >= PASSING_SCORE,
      });

      this.logger.log(
        `Loop ${loop.id} DONE — score ${finalScore.toFixed(1)}/10 in ${loop.currentRound} rounds`,
      );
    } else {
      const nextRound = loop.currentRound + 1;
      await this.loopRepo.update(loop.id, {
        currentRound: nextRound,
        currentPhase: AuditPhase.BRAINSTORM,
        finalScore,
      });

      this.emit(loop.tenantId, 'audit_loop_looping_back', {
        loopId: loop.id,
        finalScore,
        nextRound,
      });

      await this.auditQueue.add(AuditJobs.RUN_PHASE, {
        loopId: loop.id,
        phase: AuditPhase.BRAINSTORM,
      });
    }
  }

  /**
   * Karpathy LLM Wiki Pattern: Renders artifact with YAML frontmatter.
   */
  private renderArtifactMarkdown(artifact: AuditArtifact): string {
    const frontmatter = {
      ...artifact.frontmatter,
      id: artifact.id,
      kind: artifact.kind,
      round: artifact.round,
      timestamp: artifact.createdAt,
    };

    const yaml = JSON.stringify(frontmatter, null, 2);
    const content =
      typeof artifact.content === 'string'
        ? artifact.content
        : JSON.stringify(artifact.content, null, 2);

    // Wikilink sources from frontmatter
    const sourceLinks = (artifact.frontmatter.sources || [])
      .map((s: string) => `[[${s}]]`)
      .join(' ');

    return `---\n${yaml}\n---\n\n${content}\n\n${sourceLinks} [[loop:${artifact.loopId}]]`;
  }
}
