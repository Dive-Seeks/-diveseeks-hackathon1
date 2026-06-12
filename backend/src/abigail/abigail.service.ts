import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { VisionService } from '../tce/vision/vision.service';
import { VisionConflictService } from '../tce/vision/vision-conflict.service';
import { BudgetService } from './budget.service';
import { RoutingService } from './routing.service';
import { GeneralRoutingService } from './specialists/general/general-routing.service';
import { ResearchRoutingService } from './specialists/research/research-routing.service';
import { ReasoningService } from './reasoning/reasoning.service';
import { SAFE_PAIRS } from './reasoning/reasoning.types';
import { AbigailMindService } from './abigail-mind.service';
import { DeepReasoningService } from './deep-reasoning/deep-reasoning.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSession } from './entities/task-session.entity';
import { AbigailRequestDto } from './dto/abigail-request.dto';

import { RulesService } from './rules/rules.service';
import { SnapshotService } from './snapshot/snapshot.service';
import { PredictionEngineService } from './prediction/prediction-engine.service';
import { ParametricWeightService } from '../memory/parametric-weight.service';
import { WeightEffect } from '../memory/entities/parametric-weight.entity';
import { ArchitecturalRulesEngine } from './architectural-rules/architectural-rules.engine';
import { ProjectContextService } from './project-context.service';
import { SpecKitEntryService } from '../data-engine';
import { UserChatService } from '../chat/user-chat.service';

import { DeveloperProfile } from './entities/developer-profile.entity';
import {
  CompleteInterviewDto,
  SkillLevelAnswer,
  LearningDepth,
} from './dto/complete-interview.dto';

function deriveProfileFields(
  dto: CompleteInterviewDto,
): Partial<DeveloperProfile> {
  const multiplierMap: Record<SkillLevelAnswer, number> = {
    junior: 0.25,
    comfortable: 0.5,
    experienced: 1.0,
    expert: 2.0,
  };

  const depthMap: Record<LearningDepth, 0 | 1 | 2> = {
    lots: 2,
    some: 1,
    none: 0,
  };

  return {
    skillLevel: dto.skillLevel,
    taskSizeMultiplier: multiplierMap[dto.skillLevel],
    needsInlineComments:
      dto.skillLevel === 'junior' || dto.skillLevel === 'comfortable',
    needsPrExplanation: dto.explanationDepth !== 'minimal',
    offerImprovement: dto.improvementPreference !== 'never',
    learningMaterialDepth: depthMap[dto.learningDepth],
    interviewCompleted: true,
  };
}

@Injectable()
export class AbigailService {
  private readonly logger = new Logger(AbigailService.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly visionConflictService: VisionConflictService,
    private readonly routingService: RoutingService,
    private readonly generalRouting: GeneralRoutingService,
    private readonly researchRouting: ResearchRoutingService,
    private readonly budgetService: BudgetService,
    private readonly abigailMindService: AbigailMindService,
    private readonly snapshotService: SnapshotService,
    private readonly rulesService: RulesService,
    @InjectRepository(TaskSession)
    private readonly taskSessionRepo: Repository<TaskSession>,
    @InjectRepository(DeveloperProfile)
    private readonly profileRepo: Repository<DeveloperProfile>,
    private readonly parametricWeightService: ParametricWeightService,
    private readonly reasoningService: ReasoningService,
    private readonly deepReasoningService: DeepReasoningService,
    private readonly architecturalRulesEngine: ArchitecturalRulesEngine,
    private readonly projectContextService: ProjectContextService,
    private readonly specKit: SpecKitEntryService,
    private readonly predictionEngine: PredictionEngineService,
    private readonly userChatService: UserChatService,
  ) {}

  async handleRequest(dto: AbigailRequestDto) {
    try {
      console.log(
        '[AbigailService] Handling request for project:',
        dto.projectId,
      );
      if (!dto.teamId || !dto.userId) {
        throw new Error(
          'teamId and userId are required for processing Abigail requests',
        );
      }

      // Step 1 - Vision Check
      let vision;
      try {
        console.log('[AbigailService] Fetching vision...');
        vision = await this.visionService.getVision(dto.projectId);
        if (!vision) {
          console.log('[AbigailService] Vision null, redirecting...');
          return { status: 'redirect', target: 'vision_wizard' };
        }
      } catch (e) {
        this.logger.error(
          `Vision fetch failed for projectId ${dto.projectId}`,
          e instanceof Error ? e.stack : String(e),
        );
        return { status: 'redirect', target: 'vision_wizard' };
      }

      // Only persist genuine user-typed chat. canvas-run dispatches the task
      // description for every task on every run — persisting those floods the
      // user chat history with duplicate task text.
      if (dto.source !== 'canvas-run') {
        await this.userChatService.persist({
          tenantId: dto.teamId,
          projectId: dto.projectId,
          userId: dto.userId,
          team: (dto.team as any) || 'coding',
          role: 'user',
          content: dto.message,
        });
      }

      // canvas-run tasks come from the spec-kit pipeline — already
      // vision-vetted, skip the conflict gate (same reasoning as the
      // architectural gate below).
      if (dto.source !== 'canvas-run') {
        const classification = this.visionConflictService.classifyMessage(
          dto.message,
          vision,
        );
        console.log(
          '[AbigailService] Message classification:',
          classification.type,
        );
        if (
          classification.type === 'STACK_CONFLICT' ||
          classification.type === 'CONSTRAINT_CONFLICT'
        ) {
          return this.visionConflictService.getResponseTemplate(
            classification.type,
            {
              locked: vision.techStack.locked[0],
              forbidden: classification.match || vision.techStack.forbidden[0],
              constraint: classification.match || vision.constraints[0],
            },
          );
        }
      }
      // VALID_IMPROVEMENT and ALIGNED continue to the next steps

      // Step 1.5 — Architectural Rules Gate
      // canvas-run tasks come from the spec-kit pipeline — already vision-vetted, skip gate.
      let archVerdict:
        | Awaited<ReturnType<typeof this.architecturalRulesEngine.evaluate>>
        | undefined;
      if (dto.source !== 'canvas-run') {
        const sessionIdForGate = `${dto.projectId}_${Date.now()}`;
        archVerdict = await this.architecturalRulesEngine.evaluate(
          dto.message,
          dto.projectId,
          dto.teamId,
          sessionIdForGate,
        );
        if (archVerdict?.requiresVisionOverride) {
          return {
            status: 'architectural_gate',
            verdict: archVerdict,
            specialistDispatched: false,
            message: `[${archVerdict.title}] ${archVerdict.explanation} Counter-proposal: ${archVerdict.counterProposal}`,
          };
        }
        if (archVerdict) {
          this.logger.warn(
            `[Step1.5] Architectural warning: ${archVerdict.ruleId}`,
          );
        }
      }

      // Step 1.6 - Profile Apply
      console.log('[AbigailService] Applying profile for user:', dto.userId);
      let profile = await this.profileRepo.findOne({
        where: { userId: dto.userId },
      });

      if (!profile) {
        profile = this.profileRepo.create({
          userId: dto.userId,
          skillLevel: 'junior',
          taskSizeMultiplier: 0.25,
          needsInlineComments: true,
          needsPrExplanation: true,
          offerImprovement: true,
          learningMaterialDepth: 1,
          interviewCompleted: false,
        });
        await this.profileRepo.save(profile);
        return {
          status: 'redirect',
          target: 'developer_interview',
          profileId: profile.id,
        };
      }

      if (!profile.interviewCompleted) {
        return {
          status: 'redirect',
          target: 'developer_interview',
          profileId: profile.id,
        };
      }

      const effectiveMultiplier =
        profile.taskCount < 10
          ? Math.min(profile.taskSizeMultiplier, 0.25)
          : profile.taskSizeMultiplier;

      // Step 2 - Project Load
      const projectContext = {
        ...(await this.projectContextService.getProjectContext(
          dto.projectId,
          dto.teamId,
        )),
        architecturalWarning: archVerdict ?? null,
      };

      // Step 2.5 - Deep Reasoning Check
      // canvas-run tasks have specialist + description from SpecKit — skip LLM web research.
      console.log('[AbigailService] Running Deep Reasoning check...');
      const deepReasoningResult =
        dto.source === 'canvas-run'
          ? { knowledge: [], researchJobId: null }
          : await this.deepReasoningService.reason({
              taskDescription: dto.message,
              tenantId: dto.teamId || null,
              taskSessionId: null,
              triggerType: 'on_demand',
            });

      // Step 3 - Snapshot
      const snapshot = await this.snapshotService.getSnapshot(dto.projectId);

      // Step 4 - Rules Check
      console.log('[AbigailService] Evaluating rules...');
      const ruleMatch = await this.rulesService.evaluate(
        dto.message,
        dto.projectId,
      );
      if (ruleMatch?.skipSpecialist) {
        return { status: 'resolved_by_rule', result: ruleMatch.action };
      }

      // Step 4B - Parametric Weight Check (NEW)
      const resolvedTeam = (dto.team || 'coding') as
        | 'coding'
        | 'general'
        | 'research';
      let specialist = dto.specialist as any;
      let routing: any = null;
      let predictionMeta: {
        confidence: number;
        basis: string;
        ranked: any[];
      } | null = null;

      if (!specialist) {
        const loadMap = snapshot
          ? Object.fromEntries(
              (snapshot.specialists ?? []).map((s: any) => [
                s.specialistId ?? s.id,
                s.load ?? 0,
              ]),
            )
          : {};

        const prediction = await this.predictionEngine.predict(
          dto.message,
          resolvedTeam,
          dto.teamId,
          loadMap,
        );

        specialist = prediction.primarySpecialist as any;
        routing = {
          costTier: prediction.outcomeForecast.fail > 0.4 ? 'high' : 'medium',
          alwaysAlso: prediction.alsoSpecialist ?? undefined,
          branchType: 'feat',
        };
        predictionMeta = {
          confidence: prediction.confidence,
          basis: prediction.predictionBasis,
          ranked: prediction.rankedSpecialists,
        };

        this.logger.log(
          `[AbigailCEO] Step4B prediction: specialist=${specialist} confidence=${prediction.confidence.toFixed(2)} basis=${prediction.predictionBasis} tenantId=${dto.teamId}`,
        );
      } else {
        if (resolvedTeam === 'coding') {
          routing = this.routingService.mapIntent(dto.message);
        }
      }

      const weights = await this.parametricWeightService.getWeightsForRequest(
        resolvedTeam,
        dto.message,
        dto.teamId,
      );

      let injectedWeights: string[] = [];
      let matchedWeightIds: string[] = [];

      if (weights.length > 0) {
        const blockingWeight = weights.find(
          (w) => w.effect === WeightEffect.BLOCK,
        );
        if (blockingWeight) {
          console.log(
            '[AbigailService] Request blocked by parametric weight:',
            blockingWeight.id,
          );
          return {
            status: 'resolved_by_weight',
            result: blockingWeight.rule,
            weightId: blockingWeight.id,
          };
        }
        matchedWeightIds = weights.map((w) => w.id);
        injectedWeights = weights
          .filter(
            (w) =>
              w.effect === WeightEffect.INJECT_CONTEXT &&
              w.injectedContext !== null,
          )
          .map((w) => w.injectedContext as string);
      }

      // Step 4C - Reasoning Decomposition
      // canvas-run: specialist already assigned from task — skip LLM decomposition.
      const reasoningResult =
        dto.source === 'canvas-run'
          ? {
              blockedBy: null,
              usedReasoning: false,
              primarySpecialist: specialist,
              alsoSpecialist: null,
              subTasks: [],
              reasoningTrace: [],
              caiFlags: [],
            }
          : await this.reasoningService.decompose({
              message: dto.message,
              visionSummary: vision?.summary || '',
              injectedWeights,
              projectId: dto.projectId,
              tenantId: dto.teamId,
              userId: dto.userId,
            });

      if (reasoningResult.blockedBy) {
        this.logger.warn(
          `Request rejected by CAI: ${reasoningResult.blockedBy.injectorId}`,
        );
        return {
          status: 'rejected',
          reason: 'cai_hard_block',
          injectorId: reasoningResult.blockedBy.injectorId,
          message: reasoningResult.blockedBy.message,
        };
      }

      let resolvedSpecialist = specialist;
      const alsoSpecialist =
        dto.alsoSpecialist || (routing ? routing.alwaysAlso : null);
      let resolvedAlsoSpecialist = alsoSpecialist;

      if (reasoningResult.usedReasoning) {
        resolvedSpecialist = reasoningResult.primarySpecialist;
        resolvedAlsoSpecialist = reasoningResult.alsoSpecialist;
      }

      // Step 5 — Spec-Kit Gate (clarify → spec → plan → tasks)
      // canvas-run tasks already went through vision interview — spec exists in DB.
      // Skip the lifecycle call entirely to avoid 104 simultaneous clarifying-question LLM calls.
      if (dto.source !== 'canvas-run') {
        const specKitResult = await this.specKit.generate({
          projectId: dto.projectId,
          tenantId: dto.teamId,
          taskDescription: dto.message,
          clarificationAnswers: (dto as any).specKitAnswers,
          visionSummary: vision?.summary || '',
        });
        if (specKitResult.phase === 'clarifying') {
          return {
            status: 'speckit_clarifying',
            question: specKitResult.question,
            message:
              'Abigail needs one clarification before dispatching this task.',
          };
        }
      }

      // Step 5.5 — Constitution Guard
      const constitutionCheck = await this.specKit.checkConstitution(
        dto.projectId,
        dto.message,
      );
      if (!constitutionCheck.allowed) {
        return {
          status: 'constitution_violation',
          violations: constitutionCheck.violations,
          message: `Task blocked by project constitution: ${constitutionCheck.violations.join('; ')}`,
        };
      }

      // Step 6 - Budget Check
      console.log('[AbigailService] Checking budget...');
      // Parallel Dispatch Safety Check
      const costTier = routing?.costTier || 'low';
      let finalAlsoSpecialist = dto.alsoSpecialist || resolvedAlsoSpecialist;
      const allowedPair = SAFE_PAIRS[resolvedSpecialist];
      if (finalAlsoSpecialist && allowedPair !== finalAlsoSpecialist) {
        console.warn(
          `[AbigailService] Unsafe pair blocked: ${resolvedSpecialist} + ${finalAlsoSpecialist}`,
        );
        finalAlsoSpecialist = undefined;
      }

      const estimatedCost =
        costTier === 'low' ? 0.01 : costTier === 'medium' ? 0.05 : 0.1;
      const budgetOk = await this.budgetService.checkAndReserve(
        dto.teamId,
        estimatedCost,
      );
      if (!budgetOk.allowed) {
        return {
          status: 'rejected',
          reason: 'budget_exhausted',
          message: 'Budget exhausted',
        };
      }

      console.log('[AbigailService] Creating task session...');

      // DEDUP GUARD — Rule 9: tenant-scoped. Prevent duplicate pending/running sessions
      // for the same (project + taskDescription + specialist). canvas-run is the primary
      // re-entry path that floods sessions; a task that already has an active session
      // must not get a second one.
      if (dto.source === 'canvas-run') {
        const activeSession = await this.taskSessionRepo.findOne({
          where: {
            teamId: dto.teamId,
            projectId: dto.projectId,
            taskDescription: dto.message,
            specialist: resolvedSpecialist,
            status: 'pending',
          },
          select: ['id'],
        });
        if (activeSession) {
          this.logger.warn(
            `[AbigailService] Dedup: skipping session creation — active pending session ${activeSession.id} already exists for task "${dto.message.substring(0, 60)}"`,
          );
          return {
            status: 'accepted',
            sessionId: activeSession.id,
            specialist: resolvedSpecialist,
            alsoSpecialist: finalAlsoSpecialist ?? null,
            decomposed: [],
            usedReasoning: false,
            trace: [],
            estimatedCost: 'low',
            ruleMatch: undefined,
          };
        }
      }

      const outputType = resolvedTeam === 'coding' ? 'code' : 'text';
      const session = this.taskSessionRepo.create({
        teamId: dto.teamId,
        userId: dto.userId,
        projectId: dto.projectId,
        specialist: resolvedSpecialist,
        alsoSpecialist: finalAlsoSpecialist,
        team: resolvedTeam,
        outputType,
        status: 'pending',
        taskDescription: dto.message,
        context: {
          rules: ruleMatch ? [ruleMatch.action] : [],
          errorPatterns: [],
          projectContext,
          webKnowledge: deepReasoningResult.knowledge,
          researchJobId: deepReasoningResult.researchJobId,
          matchedWeightIds,
          injectedWeights,
          reasoningTrace: reasoningResult.reasoningTrace,
          caiFlags: reasoningResult.caiFlags,
          decomposedSubTasks: reasoningResult.subTasks,
          architecturalWarning: archVerdict ?? null,
          predictionMeta: predictionMeta ?? null,
          source: dto.source ?? undefined,
        },
        profileFlags: {
          skillLevel: profile.skillLevel,
          taskSizeMultiplier: effectiveMultiplier,
          needsInlineComments: profile.needsInlineComments,
          needsPrExplanation: profile.needsPrExplanation,
          offerImprovement: profile.offerImprovement,
          learningMaterialDepth: profile.learningMaterialDepth,
        },
      });

      await this.taskSessionRepo.save(session);
      console.log('[AbigailService] Task session saved:', session.id);

      // Increment taskCount on every accepted session
      await this.profileRepo.update(
        { userId: dto.userId },
        {
          taskCount: () => '"taskCount" + 1',
        },
      );

      // canvas-run awaits dispatch directly (slot-safe, sequential) — skip fire-and-forget here.
      if (dto.source !== 'canvas-run') {
        this.abigailMindService.dispatch(session.id).catch((err) => {
          this.logger.error(
            `Dispatch failed for sessionId ${session.id}`,
            err instanceof Error ? err.stack : String(err),
          );
        });
      }

      return {
        status: 'accepted',
        sessionId: session.id,
        specialist: resolvedSpecialist,
        alsoSpecialist: finalAlsoSpecialist ?? null,
        decomposed: reasoningResult.subTasks,
        usedReasoning: reasoningResult.usedReasoning,
        trace: reasoningResult.reasoningTrace,
        estimatedCost: costTier,
        ruleMatch: ruleMatch?.action,
      };
    } catch (error) {
      this.logger.error(
        `Request failed for projectId ${dto.projectId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async getProfile(
    profileId: string,
    userId: string,
  ): Promise<DeveloperProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException(`Profile ${profileId} not found`);
    if (profile.userId !== userId)
      throw new ForbiddenException('Profile does not belong to you');
    return profile;
  }

  async getMyProfile(userId: string): Promise<DeveloperProfile | null> {
    return this.profileRepo.findOne({ where: { userId } });
  }

  async completeInterview(
    profileId: string,
    userId: string,
    dto: CompleteInterviewDto,
  ): Promise<DeveloperProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException(`Profile ${profileId} not found`);
    if (profile.userId !== userId)
      throw new ForbiddenException('Profile does not belong to you');

    const derived = deriveProfileFields(dto);
    Object.assign(profile, derived);

    const saved = await this.profileRepo.save(profile);
    this.logger.log(
      `Interview completed for user ${userId} — skillLevel=${saved.skillLevel}`,
    );
    return saved;
  }
}
