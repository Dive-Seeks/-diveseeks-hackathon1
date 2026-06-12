import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskPrdRequirement } from './entities/task-prd-requirement.entity';
import { EvaluatorRegistryService } from './registries/evaluator-registry.service';
import { TeamRegistryService } from './registries/team-registry.service';
import { SpecialistRegistryService } from '../abigail/specialists/specialist-registry.service';
import { CodingSpecialistFactory } from '../abigail/specialists/coding-specialist.factory';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { TaskSession } from '../abigail/entities/task-session.entity';
import {
  EvaluationResult,
  SpecialistOutput,
} from './interfaces/evidence-evaluator.interface';
import { PrdMemoryBridgeService } from './prd-memory-bridge.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { AgentIssue } from '../issues/entities/agent-issue.entity';

@Injectable()
export class LoopOrchestratorService {
  private readonly logger = new Logger(LoopOrchestratorService.name);

  constructor(
    @InjectRepository(TaskPrdFeatureMap)
    private readonly featureMapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TaskPrdRequirement)
    private readonly reqRepo: Repository<TaskPrdRequirement>,
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
    private readonly evaluatorRegistry: EvaluatorRegistryService,
    private readonly teamRegistry: TeamRegistryService,
    private readonly specialistRegistry: SpecialistRegistryService,
    private readonly codingFactory: CodingSpecialistFactory,
    private readonly salesGateway: SalesGateway,
    private readonly dataSource: DataSource,
    private readonly memoryBridge: PrdMemoryBridgeService,
    private readonly tokenizerService: TokenizerService,
  ) {}

  async run(
    session: TaskSession,
    featureMap: TaskPrdFeatureMap,
  ): Promise<TaskPrdFeatureMap> {
    const maxIters = await this.teamRegistry.getMaxIterations(session.team);
    const timeoutSec = await this.teamRegistry.getIterationTimeoutSeconds(
      session.team,
    );
    let iteration = 0;

    while (iteration < maxIters) {
      iteration++;

      // Idempotency guard: prevents a different BullMQ worker from stealing the same
      // iteration. Uses current_iteration advancement (not a time window) so that
      // the SAME worker can run consecutive iterations (1→2→3) without blocking,
      // while still preventing two separate workers from both claiming iteration 1.
      // A duplicate worker always has current_iteration >= $1 because we advance it;
      // only the owner advancing forward will find current_iteration = $1 - 1.
      const expectedPrev = iteration - 1;
      const guard = await this.dataSource.query(
        `UPDATE task_prd_feature_maps
         SET current_iteration = $1, last_iteration_at = NOW()
         WHERE id = $2 AND current_iteration = $3`,
        [iteration, featureMap.id, expectedPrev],
      );
      if (guard[1] === 0) {
        this.logger.warn(
          `Another worker claimed iteration for ${featureMap.id} - exiting`,
        );
        return featureMap;
      }

      const pending = await this.getPendingRequirements(featureMap.id);
      if (pending.length === 0) break;

      this.salesGateway.server.emit('prd_iteration_started', {
        sessionId: session.id,
        iterationNumber: iteration,
        pendingCount: pending.length,
      });

      // Sleep per-evaluator max delay
      const flags = pending.flatMap((r) => Object.keys(r.flags));
      const delayMs = this.evaluatorRegistry.maxDelayForFlags(
        flags,
        session.team,
      );
      if (iteration > 1 && delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs + Math.random() * 200));
      }

      // Execute specialist with timeout — catch both resolve(null) [PRD deadline] and rejection [heartbeat abort]
      let specialistOutput: SpecialistOutput | null = null;
      try {
        specialistOutput = await this.executeWithTimeout(
          () => this.executeSpecialist(session, pending, featureMap),
          timeoutSec * 1000,
        );
      } catch (specialistErr) {
        const errMsg = (specialistErr as Error).message ?? '';
        const sc = specialistErr?.statusCode ?? specialistErr?.status;
        const thrownReason =
          sc === 503 ||
          sc === 502 ||
          errMsg.toLowerCase().includes('high demand') ||
          errMsg.toLowerCase().includes('experiencing demand') ||
          errMsg.toLowerCase().includes('try again later') ||
          errMsg.toLowerCase().includes('temporarily unavailable')
            ? 'overloaded'
            : sc === 429 || errMsg.toLowerCase().includes('rate limit')
              ? 'rate_limit'
              : errMsg.toLowerCase().includes('timeout') ||
                  errMsg.toLowerCase().includes('budget')
                ? 'timeout'
                : 'iteration_timeout';
        this.logger.warn(
          `[LoopOrchestrator] executeSpecialist threw (${thrownReason}): ${errMsg}`,
        );
      }

      if (specialistOutput === null) {
        // timeout/overload — mark all in-flight as fail, reset issue lock, then continue
        for (const req of pending) {
          await this.persistRequirementResult(
            req,
            featureMap,
            iteration,
            { satisfied: false, evidence: {}, error: 'iteration_timeout' },
            'timeout',
          );
        }
        // Reset the AgentIssue so the next iteration can re-checkout.
        // The background specialist may still be running and will call releaseIssue()
        // on completion — that's fine because releaseIssue now sets status='assigned'.
        await this.resetIssueForRetry(session.id);
        continue;
      }

      // Evaluate each requirement sequentially
      for (const req of pending) {
        const evaluators = this.evaluatorRegistry.findByFlags(
          Object.keys(req.flags),
          session.team,
        );
        if (evaluators.length === 0) {
          await this.persistRequirementResult(
            req,
            featureMap,
            iteration,
            {
              satisfied: false,
              evidence: {},
              error: 'no_evaluator_for_flags',
            },
            '<none>',
          );
          continue;
        }

        const combinedResult: EvaluationResult = {
          satisfied: true,
          evidence: {},
        };
        for (const evaluator of evaluators) {
          try {
            const result = await evaluator.evaluate(
              req as any,
              specialistOutput,
              this.buildEvalContext(session),
            );
            combinedResult.satisfied =
              combinedResult.satisfied && result.satisfied;
            combinedResult.evidence = {
              ...combinedResult.evidence,
              [evaluator.evaluatorId]: result.evidence,
            };
            if (result.error) combinedResult.error = result.error;
            if (result.requiresHumanApproval) {
              combinedResult.requiresHumanApproval = true;
              combinedResult.humanInstruction = result.humanInstruction;
            }
          } catch (e) {
            combinedResult.satisfied = false;
            combinedResult.error = `evaluator_crash:${evaluator.evaluatorId}:${(e as Error).message}`;
          }
        }

        await this.persistRequirementResult(
          req,
          featureMap,
          iteration,
          combinedResult,
          evaluators.map((e) => e.evaluatorId).join(','),
        );

        this.salesGateway.server.emit('prd_requirement_evaluated', {
          sessionId: session.id,
          requirementId: req.requirementId,
          satisfied: combinedResult.satisfied,
          evidence: combinedResult.evidence,
        });

        if (combinedResult.requiresHumanApproval) {
          this.salesGateway.emitHumanActionNeeded({
            taskSessionId: session.id,
            requirementId: req.requirementId,
            requirementText: req.requirementText,
            watchingFor: [],
            timeoutMs: 120000,
            instruction: combinedResult.humanInstruction || 'Please review',
          });
        }
      }

      await this.updateCounters(featureMap.id);
      const refreshed = await this.featureMapRepo.findOne({
        where: { id: featureMap.id },
      });
      if (refreshed!.satisfiedRequirements >= refreshed!.totalRequirements)
        break;

      // Check if all remaining are blocked
      const stillPending = await this.getPendingRequirements(featureMap.id);
      if (stillPending.length === 0) {
        const blocked = await this.reqRepo.count({
          where: { featureMapId: featureMap.id, status: 'blocked' },
        });
        if (blocked > 0) {
          await this.featureMapRepo.update(featureMap.id, {
            status: 'human_review',
          });
          return (await this.featureMapRepo.findOne({
            where: { id: featureMap.id },
          }))!;
        }
      }
    }

    // Final status
    const final = await this.featureMapRepo.findOne({
      where: { id: featureMap.id },
    });
    const finalStatus =
      final!.satisfiedRequirements >= final!.totalRequirements
        ? 'complete'
        : 'failed';
    await this.featureMapRepo.update(featureMap.id, { status: finalStatus });

    const completedMap = (await this.featureMapRepo.findOne({
      where: { id: featureMap.id },
    }))!;

    // Bridge per-requirement evidence into agent_episodes (non-fatal)
    try {
      await this.memoryBridge.bridgeFeatureMap(completedMap, session);
    } catch (e) {
      this.logger.warn(
        `[PrdMemoryBridge] bridge failed: ${(e as Error).message}`,
      );
    }

    return completedMap;
  }

  private async getPendingRequirements(
    featureMapId: string,
  ): Promise<TaskPrdRequirement[]> {
    // Latest row per requirement_id where satisfied=false and status != 'blocked'.
    // Raw query returns snake_case columns; map to entity so camelCase props
    // (requirementId / requirementText) are populated — otherwise downstream
    // inserts persist NULL requirement_id and violate the NOT NULL constraint.
    const rows = await this.dataSource.query(
      `
      SELECT DISTINCT ON (requirement_id)
        id, tenant_id, feature_map_id, task_session_id, requirement_id,
        requirement_text, flags, satisfied, status, evidence, error_message,
        iteration_number, evaluator_name, human_note
      FROM task_prd_requirements
      WHERE feature_map_id = $1
      ORDER BY requirement_id, iteration_number DESC
    `,
      [featureMapId],
    );

    return rows
      .map((r: any) =>
        this.reqRepo.create({
          id: r.id,
          tenantId: r.tenant_id,
          featureMapId: r.feature_map_id,
          taskSessionId: r.task_session_id,
          requirementId: r.requirement_id,
          requirementText: r.requirement_text,
          flags: r.flags,
          satisfied: r.satisfied,
          status: r.status,
          evidence: r.evidence,
          errorMessage: r.error_message,
          iterationNumber: r.iteration_number,
          evaluatorName: r.evaluator_name,
          humanNote: r.human_note,
        }),
      )
      .filter((r) => !r.satisfied && r.status !== 'blocked');
  }

  private async persistRequirementResult(
    sourceReq: TaskPrdRequirement,
    featureMap: TaskPrdFeatureMap,
    iteration: number,
    result: EvaluationResult,
    evaluatorName: string,
  ): Promise<void> {
    const row = this.reqRepo.create({
      tenantId: featureMap.tenantId,
      featureMapId: featureMap.id,
      taskSessionId: featureMap.taskSessionId,
      requirementId: sourceReq.requirementId,
      requirementText: sourceReq.requirementText,
      flags: sourceReq.flags,
      satisfied: result.satisfied,
      status: result.requiresHumanApproval
        ? 'blocked'
        : result.satisfied
          ? 'pass'
          : 'fail',
      evidence: result.evidence,
      errorMessage: result.error ?? null,
      iterationNumber: iteration,
      evaluatorName,
    });
    await this.reqRepo.save(row);
  }

  private async updateCounters(featureMapId: string): Promise<void> {
    const [{ count }] = await this.dataSource.query(
      `
      SELECT COUNT(DISTINCT requirement_id) AS count
      FROM task_prd_requirements
      WHERE feature_map_id = $1 AND satisfied = true
    `,
      [featureMapId],
    );
    await this.featureMapRepo.update(featureMapId, {
      satisfiedRequirements: parseInt(count, 10),
    });
  }

  private async buildPreviousEvidence(
    featureMapId: string,
  ): Promise<Record<string, any>> {
    const rows = await this.dataSource.query(
      `
      SELECT DISTINCT ON (requirement_id) requirement_id, satisfied, evidence, error_message
      FROM task_prd_requirements
      WHERE feature_map_id = $1
      ORDER BY requirement_id, iteration_number DESC
    `,
      [featureMapId],
    );
    const res: Record<string, any> = {};
    for (const r of rows) {
      res[r.requirement_id] = {
        satisfied: r.satisfied,
        evidence: r.evidence,
        error: r.error_message,
      };
    }
    return res;
  }

  private async collectHumanRejectionNotes(
    featureMapId: string,
  ): Promise<Array<{ requirementId: string; note: string }>> {
    const rows = await this.reqRepo.find({
      where: { featureMapId, status: 'blocked' },
      order: { iterationNumber: 'DESC' },
    });
    return rows
      .filter((r) => r.humanNote)
      .map((r) => ({ requirementId: r.requirementId, note: r.humanNote! }));
  }

  private buildBudgetedEvidence(
    rawEvidence: Record<string, any>,
    maxTokens: number,
  ): Record<string, any> {
    const fullText = JSON.stringify(rawEvidence);
    const fullTokens = this.tokenizerService.countTokens(fullText);

    if (fullTokens <= maxTokens) return rawEvidence;

    this.logger.warn(
      `[LoopOrchestrator] Evidence budget exceeded (${fullTokens} tokens > ${maxTokens}) — truncating`,
    );

    // Keep requirements in order, drop those that don't fit
    const result: Record<string, any> = {};
    let used = 2; // for {} brackets
    for (const [key, value] of Object.entries(rawEvidence)) {
      const entry = JSON.stringify({ [key]: value });
      const entryTokens = this.tokenizerService.countTokens(entry);
      if (used + entryTokens > maxTokens) break;
      result[key] = value;
      used += entryTokens;
    }
    return result;
  }

  private async executeSpecialist(
    session: TaskSession,
    pending: any[],
    featureMap: TaskPrdFeatureMap,
  ): Promise<SpecialistOutput> {
    // Build prdContext for specialist
    const prdContext = {
      featureMapId: featureMap.id,
      pendingRequirements: pending.map((r) => ({
        id: r.requirementId,
        text: r.requirementText,
        flags: r.flags,
      })),
      previousIterationEvidence: this.buildBudgetedEvidence(
        await this.buildPreviousEvidence(featureMap.id),
        2000,
      ),
      humanRejectionNotes: await this.collectHumanRejectionNotes(featureMap.id),
    };
    this.logger.debug(
      `[LoopOrchestrator] featureMap=${featureMap.id} evidenceTokens=${this.tokenizerService.countTokens(JSON.stringify(prdContext.previousIterationEvidence))}`,
    );
    // Existing specialist execution path - get specialist from registry,
    // inject prdContext into context, call execute()
    const ctx = { ...((session.context as any) || {}), prdContext };
    const primary =
      session.team === 'coding'
        ? this.codingFactory.getSpecialist(session.specialist)
        : this.specialistRegistry.get(session.team, session.specialist);
    const alsoAgent = (session as any).alsoSpecialist
      ? session.team === 'coding'
        ? this.codingFactory.getSpecialist((session as any).alsoSpecialist)
        : this.specialistRegistry.get(
            session.team,
            (session as any).alsoSpecialist,
          )
      : null;

    const [primaryOut, secondaryOut] = await Promise.all([
      primary.execute({ ...session, context: ctx } as any),
      alsoAgent
        ? alsoAgent.execute({ ...session, context: ctx } as any)
        : Promise.resolve(null),
    ]);
    return this.mergeOutputs(
      this.normalizeOutput(primaryOut),
      secondaryOut ? this.normalizeOutput(secondaryOut) : null,
    );
  }

  // Bridge between BaseSpecialist's {result, report} shape and the evaluator SpecialistOutput shape.
  private normalizeOutput(raw: any): SpecialistOutput {
    if (raw && typeof raw.rawOutput === 'string')
      return raw as SpecialistOutput;
    return {
      rawOutput: raw?.result ?? '',
      artefacts: raw?.artefacts ?? [],
      toolCalls: raw?.toolCalls ?? [],
      files: raw?.files ?? [],
      messages: raw?.messages ?? [],
      reasoning: raw?.reasoning ?? '',
    };
  }

  private mergeOutputs(primary: any, secondary: any): SpecialistOutput {
    if (!secondary) return primary as SpecialistOutput;
    return {
      artefacts: [...(primary.artefacts || []), ...(secondary.artefacts || [])],
      reasoning: `${primary.reasoning || ''}\n---\n${secondary.reasoning || ''}`,
      toolCalls: [...(primary.toolCalls || []), ...(secondary.toolCalls || [])],
      files: [
        ...new Set([...(primary.files || []), ...(secondary.files || [])]),
      ],
      messages: [...(primary.messages || []), ...(secondary.messages || [])],
      rawOutput: `${primary.rawOutput || ''}\n${secondary.rawOutput || ''}`,
    };
  }

  private buildEvalContext(session: TaskSession): any {
    return {
      session: {
        id: session.id,
        teamId: (session as any).tenantId,
        projectId: session.projectId,
        specialist: session.specialist,
        team: session.team,
      },
      vision: (session.context as any)?.vision || {
        constraints: [],
        techStack: { locked: [], forbidden: [] },
      },
      sandbox: (session.context as any)?.sandbox || null,
      previousEvidence: {},
    };
  }

  private async resetIssueForRetry(issueId: string): Promise<void> {
    try {
      await this.issueRepo.update(
        { id: issueId },
        { status: 'assigned', executionLockedAt: null, checkoutRunId: null },
      );
    } catch (e) {
      this.logger.warn(
        `[LoopOrchestrator] resetIssueForRetry failed for ${issueId}: ${(e as Error).message}`,
      );
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    ms: number,
  ): Promise<T | null> {
    const fnPromise = fn();
    // Attach a no-op catch so that if the LoopOrchestrator iteration timeout fires first
    // (resolving null) and the specialist/heartbeat later rejects in the background,
    // that late rejection is silenced instead of becoming an unhandled rejection that
    // crashes the Node.js 20 process (--unhandled-rejections=throw default).
    fnPromise.catch(() => {});
    return Promise.race<T | null>([
      fnPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  }
}
