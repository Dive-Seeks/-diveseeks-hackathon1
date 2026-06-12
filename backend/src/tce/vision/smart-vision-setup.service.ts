import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { generateText, LanguageModel } from 'ai';

import { BrainSessionService } from '../../abigail-brain/brain-session.service';
import { BrainTechniqueService } from '../../abigail-brain/brain-technique.service';
import { UnifiedKnowledgeService } from '../../abigail/unified-knowledge.service';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { SessionBridgeService } from '../../memory/session-bridge.service';
import { VisionService } from './vision.service';
import { TceService } from '../tce.service';
import { CyclePubSubService } from '../../common/cycle-pubsub.service';
import { DiveSeeksProject } from '../entities/diveseeks-project.entity';
import { UserLlmResolverService } from '../../ai-integration/user-llm-resolver.service';
import {
  VisionTurnEnvelope,
  VisionTurnEnvelopeSchema,
  VisionChatTurn,
  UserAction,
  VisionStep,
  CeoBriefResult,
  VISION_STEPS,
} from './vision-setup-envelope.types';
import {
  SMART_VISION_SETUP_SYSTEM_PROMPT,
  buildPerTurnContext,
  buildJsonRetryPrompt,
  CEO_BRIEF_SYSTEM_PROMPT,
  buildCeoBriefPrompt,
} from './smart-vision-setup-prompts';
import { applyVisionSetupDiscipline } from './smart-vision-setup-discipline';

export interface SmartVisionSetupInput {
  projectId: string;
  projectName: string;
  tenantId: string;
  userId: string;
  history: VisionChatTurn[];
  userAction: UserAction | null;
  currentStep?: VisionStep;
}

@Injectable()
export class SmartVisionSetupService {
  private readonly logger = new Logger(SmartVisionSetupService.name);

  constructor(
    private readonly brainSession: BrainSessionService,
    private readonly techniqueService: BrainTechniqueService,
    private readonly knowledge: UnifiedKnowledgeService,
    private readonly aiRouter: AiProviderRouter,
    private readonly sessionBridge: SessionBridgeService,
    private readonly visionService: VisionService,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    private readonly tceService: TceService,
    private readonly cyclePubSub: CyclePubSubService,
    private readonly userLlmResolver: UserLlmResolverService,
  ) {}

  async chat(input: SmartVisionSetupInput): Promise<VisionTurnEnvelope> {
    this.logger.log(
      `[SmartVisionSetup] chat() called — projectId=${input.projectId} tenantId=${input.tenantId}`,
    );
    // 1. BrainSession lookup or open
    let session:
      | import('../../abigail-brain/entities/brain-session.entity').BrainSession
      | null;
    try {
      session = await this.brainSession.getActiveForProject(
        input.tenantId,
        input.projectId,
      );
    } catch (err) {
      this.logger.error(
        `[SmartVisionSetup] BrainSession.getActiveForProject failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
    if (session === null || session === undefined) {
      session = await this.brainSession.openForProject({
        tenantId: input.tenantId,
        projectId: input.projectId,
        topic: input.projectName,
        intentType: 'design',
      });
      this.logger.log(
        `[SmartVisionSetup] Opened BrainSession ${session.id} for project ${input.projectId}`,
      );
    }

    // 2. Project context load (moved up — needed by CEO brief before step derivation)
    // OR-conditions mirror getProject: projects may be scoped by userId (when teamId was null at creation)
    const projectConditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (input.userId)
      projectConditions.push({ id: input.projectId, userId: input.userId });
    if (input.tenantId)
      projectConditions.push({ id: input.projectId, teamId: input.tenantId });
    if (projectConditions.length === 0)
      projectConditions.push({ id: input.projectId });
    const project = await this.projectRepo.findOne({
      where: projectConditions,
    });
    if (!project) {
      this.logger.warn(
        `[SmartVisionSetup] Project ${input.projectId} not found for userId=${input.userId} tenantId=${input.tenantId}`,
      );
      throw new BadRequestException(`Project ${input.projectId} not found.`);
    }

    // 3a. Short-circuit: if this is a resume turn and vision is already complete, return visionReady immediately
    const isResumingComplete =
      input.userAction?.type === 'init' && input.history.length > 0;
    if (isResumingComplete) {
      const savedVision = await this.visionService.getVision(input.projectId);
      // Check setupComplete flag OR check last assistant turn's status snapshot
      const lastAssistantTurn = [...input.history]
        .reverse()
        .find((t) => t.role === 'assistant' && t.visionTableSnapshot);
      const lastStatus = lastAssistantTurn?.visionTableSnapshot?.status;
      const allConfirmedInHistory =
        lastStatus?.description === 'confirmed' &&
        lastStatus?.tech_stack === 'confirmed' &&
        lastStatus?.first_goal === 'confirmed' &&
        lastStatus?.constraints === 'confirmed' &&
        lastStatus?.open_questions === 'confirmed';
      if (savedVision?.setupComplete === true || allConfirmedInHistory) {
        this.logger.log(
          `[SmartVisionSetup] Resume turn — vision already complete (setupComplete=${savedVision?.setupComplete}, allConfirmedInHistory=${allConfirmedInHistory}), short-circuiting with visionReady=true`,
        );
        const suggestedTasks = savedVision?.suggestedTasks ?? [];
        // If vision wasn't saved with setupComplete yet, save it now from history snapshot
        if (
          !savedVision?.setupComplete &&
          lastAssistantTurn?.visionTableSnapshot
        ) {
          const vt = lastAssistantTurn.visionTableSnapshot;
          await this.visionService
            .updateVision(input.projectId, {
              ...savedVision,
              description: vt.description ?? savedVision?.description ?? '',
              techStack: vt.techStack,
              goals: vt.goals,
              constraints: vt.constraints,
              openQuestions: vt.openQuestions,
              setupComplete: true,
              suggestedTasks,
            } as any)
            .catch((e) =>
              this.logger.warn(
                `[SmartVisionSetup] Failed to save complete vision on resume: ${(e as Error).message}`,
              ),
            );
        }
        const resumeVisionTable = lastAssistantTurn?.visionTableSnapshot ?? {
          name: project.name,
          description: null,
          techStack: {
            locked: [],
            forbidden: [],
            frontend: [],
            backend: [],
            infra: [],
          },
          goals: [],
          constraints: [],
          openQuestions: [],
          status: {
            description: 'confirmed' as const,
            tech_stack: 'confirmed' as const,
            first_goal: 'confirmed' as const,
            constraints: 'confirmed' as const,
            open_questions: 'confirmed' as const,
          },
        };
        return {
          sessionId: session.id,
          step: 'open_questions' as VisionStep,
          stepIndex: 5,
          totalSteps: 5,
          abigailMessage: `Vision is complete for "${project.name}". Enabling full chat now.`,
          card: null,
          visionTable: resumeVisionTable,
          visionReady: true,
          finalVision: savedVision as any,
          suggestedTasks,
        };
      }
    }

    // 3b. CEO brief on init turn — reads name+description, decides what to skip
    let ceoBrief: CeoBriefResult | null = null;
    const isInitTurn =
      input.userAction?.type === 'init' && input.history.length === 0;
    if (isInitTurn) {
      this.logger.log(
        `[SmartVisionSetup] Init turn — running CEO brief for project "${project.name}"`,
      );
      ceoBrief = await this.ceoBrief(project.name, project.description ?? '');
      // Persist suggestedTasks + isSoftwareProject into vision file now so they survive until visionReady fires
      if (ceoBrief) {
        const existingVision = await this.visionService.getVision(
          input.projectId,
        );
        if (existingVision) {
          if (ceoBrief.suggestedTasks?.length)
            existingVision.suggestedTasks = ceoBrief.suggestedTasks;
          (existingVision as any).isSoftwareProject =
            ceoBrief.isSoftwareProject;
          await this.visionService
            .updateVision(input.projectId, existingVision)
            .catch((e) =>
              this.logger.warn(
                `[SmartVisionSetup] Failed to persist CEO brief metadata: ${(e as Error).message}`,
              ),
            );
          this.logger.log(
            `[SmartVisionSetup] Persisted ${ceoBrief.suggestedTasks?.length ?? 0} suggestedTasks + isSoftwareProject=${ceoBrief.isSoftwareProject} to vision file`,
          );
        }
      }
    }

    // 4. Determine current step — prefer frontend-sent currentStep (authoritative),
    //    fall back to heuristic derivation from history length.
    const step = input.currentStep ?? this.deriveStepFromHistory(input.history);
    const stepIndex = this.stepIndexOf(step);
    this.logger.log(
      `[SmartVisionSetup] Step resolved: ${step} (index ${stepIndex}) — source: ${input.currentStep ? 'client' : 'heuristic'}, history length: ${input.history.length}`,
    );

    // 5. Technique selection (was step 3)
    const technique = this.techniqueService.selectTechniqueForVisionStep(step);

    // 6. Knowledge retrieval (graceful degradation when pgvector down)
    let knowledgeBlock = '';
    try {
      knowledgeBlock = await this.knowledge.getUnifiedKnowledge(
        input.tenantId,
        `${project.name} ${project.description}`,
      );
    } catch (err) {
      this.logger.warn(
        `[SmartVisionSetup] Knowledge retrieval failed: ${(err as Error).message}`,
      );
    }

    // 7. Build vision table from history with CEO brief
    // On init turn, ceoBrief is freshly computed — pass it to seed the table.
    // On non-init turns, ceoBrief is null but we still need to enforce CEO brief
    // decisions (e.g. tech_stack skipped for non-software projects). Load it from
    // vision file's persisted isSoftwareProject flag if available.
    let briefForTable = ceoBrief ?? undefined;
    if (!briefForTable && input.userAction?.type !== 'init') {
      const savedVisionForBrief = await this.visionService.getVision(
        input.projectId,
      );
      if (
        savedVisionForBrief &&
        (savedVisionForBrief as any).isSoftwareProject === false
      ) {
        // Reconstruct a minimal brief stub that enforces tech_stack skip
        briefForTable = {
          inferredSections: ['tech_stack'] as VisionStep[],
          inferredDescription: null,
          inferredTechStack: null,
          inferredConstraints: [],
          isSoftwareProject: false,
          openingQuestion: '',
          openingCardKind: 'free_text' as const,
          openingOptions: [],
          suggestedTasks: [],
        };
      }
    }
    const visionTable = this.buildVisionTableFromHistory(
      project.name,
      input.history,
      briefForTable,
    );

    // 8. Build per-turn context + CEO brief injection + LLM call
    const userFreeText =
      input.userAction?.type === 'free_text'
        ? (input.userAction.payload?.text ?? '')
        : '';

    // Count assistant turns that explicitly belong to the current step.
    // Turns with stepSnapshot == null are old restored turns without snapshot — exclude them
    // to avoid inflating the count and triggering premature advancement warnings.
    // Also exclude the current init/resume turn (userAction.type === 'init').
    const isResumeTurn = input.userAction?.type === 'init';
    const turnsInStep = isResumeTurn
      ? 0
      : input.history.filter(
          (t) => t.role === 'assistant' && t.stepSnapshot === step,
        ).length;

    // Use briefForTable (which includes reconstructed non-software stubs) for domain context injection.
    // On init turn, ceoBrief === briefForTable. On subsequent turns, briefForTable may be a minimal stub.
    const activeBrief = briefForTable;
    const ceoBriefBlock = activeBrief
      ? `\nCEO PRE-ANALYSIS:\nProject domain: ${activeBrief.isSoftwareProject ? 'SOFTWARE (tech stack questions are appropriate)' : 'NON-SOFTWARE (do NOT ask software tech stack questions — treat tech_stack as already confirmed and skip it)'}\nInferred sections (already filled — do not re-ask about these): ${activeBrief.inferredSections.join(', ') || 'none'}${ceoBrief ? `\nMost ambiguous unknown: "${ceoBrief.openingQuestion}"\nSuggested opening card kind: ${ceoBrief.openingCardKind}\nSuggested options: ${JSON.stringify(ceoBrief.openingOptions)}\nIMPORTANT: Use this opening question and card on your very first response. Do not ask about already-inferred sections.` : '\nNote: This is a follow-up turn. Continue with the current step — do not restart the conversation.'}`
      : '';
    const contextBlock =
      buildPerTurnContext({
        step,
        stepIndex,
        turnsInStep,
        sessionId: session.id,
        projectId: input.projectId,
        projectName: project.name,
        projectDescription: project.description ?? '',
        visionTable,
        userAction: input.userAction,
        userFreeText,
        knowledgeBlock,
        techniqueName: technique,
      }) + ceoBriefBlock;
    this.logger.log(
      `[SmartVisionSetup] turnsInStep=${turnsInStep} for step=${step}`,
    );

    if (contextBlock.length > 30_000) {
      this.logger.warn(
        `[SmartVisionSetup] contextBlock is ${contextBlock.length} chars — may exceed model context window`,
      );
    }
    const userLlm = await this.resolveUserModel(input.userId);
    const envelope = await this.callLlmAndParse(
      contextBlock,
      input.history,
      userLlm,
      step,
      stepIndex,
      visionTable,
    );

    // 8. Discipline pass
    const conversationTexts = [
      project.description ?? '',
      ...input.history.map((h) => h.content),
      userFreeText,
    ];
    const disciplined = applyVisionSetupDiscipline(envelope, conversationTexts);
    if (disciplined.violations.length > 0) {
      this.logger.warn(
        `[SmartVisionSetup] Discipline violations: ${disciplined.violations.join(', ')}`,
      );
    }

    // 9. Vision ready: save vision + complete session + memory bridge
    // Read suggestedTasks BEFORE overwriting the vision file — the file holds tasks persisted on init turn.
    let suggestedTasks: string[] = ceoBrief?.suggestedTasks ?? [];
    if (disciplined.envelope.visionReady && suggestedTasks.length === 0) {
      const savedVision = await this.visionService.getVision(input.projectId);
      suggestedTasks = savedVision?.suggestedTasks ?? [];
      this.logger.log(
        `[SmartVisionSetup] visionReady — loaded ${suggestedTasks.length} suggestedTasks from vision file`,
      );
    }

    if (disciplined.envelope.visionReady && disciplined.envelope.finalVision) {
      await this.visionService.updateVision(input.projectId, {
        ...disciplined.envelope.finalVision,
        setupComplete: true,
        suggestedTasks,
      });
      await this.brainSession.complete(session.id, input.tenantId);
      await this.sessionBridge
        .bridge(input.tenantId, 'vision-setup', input.userId, {
          activeTask: `Vision setup for ${project.name}`,
          constraintsAndPreferences:
            disciplined.envelope.finalVision.constraints.join('; '),
          keyDecisions: `Stack: ${disciplined.envelope.finalVision.techStack.locked.join(', ')}; First goal: ${disciplined.envelope.finalVision.goals[0]?.title ?? 'n/a'}`,
        })
        .catch((e) =>
          this.logger.warn(
            `[SmartVisionSetup] SessionBridge failed: ${(e as Error).message}`,
          ),
        );

      // Trigger Gap Analysis + publishVisionReady
      this.tceService
        .runGapAnalysis(input.projectId, input.tenantId)
        .then((result) => {
          this.cyclePubSub
            .publishVisionReady({
              tenantId: input.tenantId,
              userId: input.userId,
              projectId: input.projectId,
              projectName: project.name,
              teamId: input.tenantId,
              team: project.team,
              taskCount: result.taskCount,
              goalTitles: result.goalTitles,
            })
            .catch((err) => {
              this.logger.error(
                `[SmartVisionSetup] publishVisionReady failed for ${input.projectId}`,
                err,
              );
            });
        })
        .catch((err) => {
          this.logger.error(
            `[SmartVisionSetup] Initial gap analysis failed for ${input.projectId}`,
            err,
          );
        });
    }

    const finalEnvelope: VisionTurnEnvelope = {
      ...disciplined.envelope,
      suggestedTasks,
    };

    // Persist this turn's user action + assistant response to vision chat history
    const now = new Date().toISOString();
    const turnMessages: import('./vision.types').VisionChatMessage[] = [];
    if (input.userAction && input.userAction.type !== 'init') {
      const payload = (input.userAction as any)?.payload;
      const userText =
        payload?.displayText ||
        userFreeText ||
        (Array.isArray(payload?.selectedIds)
          ? payload.selectedIds.join(', ')
          : payload?.selectedId) ||
        input.userAction.type;
      turnMessages.push({
        role: 'user',
        content: userText,
        step,
        createdAt: now,
      });
    }
    turnMessages.push({
      role: 'assistant',
      content: finalEnvelope.abigailMessage,
      step,
      visionTable: finalEnvelope.visionTable,
      createdAt: now,
    });
    this.visionService
      .appendChatMessages(input.projectId, turnMessages)
      .catch((e) =>
        this.logger.warn(
          `[SmartVisionSetup] appendChatMessages failed: ${(e as Error).message}`,
        ),
      );

    this.logger.debug(
      `[SmartVisionSetup] Returning envelope — visionReady=${finalEnvelope.visionReady} suggestedTasks=${finalEnvelope.suggestedTasks?.length ?? 0}`,
    );
    return finalEnvelope;
  }

  private async ceoBrief(
    projectName: string,
    projectDescription: string,
  ): Promise<CeoBriefResult | null> {
    if (!projectDescription || projectDescription.trim().length < 10) {
      this.logger.debug(
        `[ceoBrief] Description too short (${projectDescription?.length ?? 0} chars) — skipping brief`,
      );
      return null;
    }
    this.logger.log(
      `[ceoBrief] Running CEO brief for project "${projectName}"`,
    );
    try {
      // Uses platform model intentionally — ceoBrief is a system framing call before user context is established.
      const model = this.aiRouter.getModel('researcher');
      const result = await generateText({
        model,
        system: CEO_BRIEF_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildCeoBriefPrompt(projectName, projectDescription),
          },
        ],
      });
      const cleaned = result.text
        .replace(/```json|```/g, '')
        .replace(/:\s*undefined\b/g, ': null')
        .trim();
      const parsed = JSON.parse(cleaned) as CeoBriefResult;
      // Runtime shape guard — LLM may return partial objects
      if (
        !Array.isArray(parsed.inferredSections) ||
        typeof parsed.openingQuestion !== 'string' ||
        !Array.isArray(parsed.suggestedTasks)
      ) {
        this.logger.warn(
          `[ceoBrief] LLM returned malformed CeoBriefResult — missing required fields, skipping brief`,
        );
        return null;
      }
      // Normalize isSoftwareProject — default true if LLM omitted it
      if (typeof parsed.isSoftwareProject !== 'boolean') {
        parsed.isSoftwareProject = true;
      }
      // If not a software project, ensure tech_stack is in inferredSections
      if (
        !parsed.isSoftwareProject &&
        !parsed.inferredSections.includes('tech_stack')
      ) {
        parsed.inferredSections.push('tech_stack');
        this.logger.log(
          `[ceoBrief] Non-software project — auto-adding tech_stack to inferredSections`,
        );
      }
      this.logger.log(
        `[ceoBrief] OK — isSoftware=${parsed.isSoftwareProject} inferred=${parsed.inferredSections.join(',') || 'none'} opening="${parsed.openingQuestion.substring(0, 60)}" tasks=${parsed.suggestedTasks.length}`,
      );
      return parsed;
    } catch (err) {
      this.logger.warn(
        `[ceoBrief] Failed — continuing without brief: ${(err as Error).message}`,
      );
      return null;
    }
  }

  // Per-user key resolution — delegates to UserLlmResolverService (single source of truth for BYOK).
  private async resolveUserModel(
    userId: string,
  ): Promise<LanguageModel | null> {
    return this.userLlmResolver.resolveModel(userId);
  }

  private async callLlmAndParse(
    contextBlock: string,
    history: VisionChatTurn[],
    userLlm?: LanguageModel | null,
    currentStep?: VisionStep,
    currentStepIndex?: number,
    currentVisionTable?: import('./vision-setup-envelope.types').VisionTableSnapshot,
  ): Promise<VisionTurnEnvelope> {
    const model = userLlm ?? this.aiRouter.getModel('chat');
    const messages = [
      ...history.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user' as const, content: contextBlock },
    ];

    // First attempt
    try {
      const result = await generateText({
        model,
        system: SMART_VISION_SETUP_SYSTEM_PROMPT,
        messages,
      });
      return this.parseEnvelope(result.text);
    } catch (err) {
      this.logger.warn(
        `[SmartVisionSetup] First LLM attempt failed: ${(err as Error).message} — retrying once`,
      );
    }

    // Second attempt — prefer env fallback over same failing user model
    const fallbackModel = this.aiRouter.getFallbackModel();
    try {
      const result = await generateText({
        model: fallbackModel,
        system: SMART_VISION_SETUP_SYSTEM_PROMPT,
        messages: [
          ...messages,
          {
            role: 'user' as const,
            content: buildJsonRetryPrompt(
              'Your last response was not valid JSON.',
            ),
          },
        ],
      });
      return this.parseEnvelope(result.text);
    } catch (err) {
      this.logger.error(
        `[SmartVisionSetup] LLM retry also failed: ${(err as Error).message} — returning static fallback`,
      );
      return this.buildStaticFallbackEnvelope(
        currentStep,
        currentStepIndex,
        currentVisionTable,
      );
    }
  }

  private parseEnvelope(text: string): VisionTurnEnvelope {
    this.logger.debug(`[SmartVisionSetup] Raw LLM text FULL:\n${text}`);
    // Strip markdown fences, replace bare `undefined` JSON values with `null`
    const cleaned = text
      .replace(/```json|```/g, '')
      .replace(/:\s*undefined\b/g, ': null')
      .trim();
    let raw: unknown;
    try {
      raw = JSON.parse(cleaned);
    } catch (e) {
      throw new BadRequestException(
        `Invalid JSON from LLM: ${(e as Error).message}`,
      );
    }
    // Sanitize: if card is present but fails discriminated union, null it out so we get a response
    const rawObj = raw as Record<string, unknown>;
    if (
      rawObj &&
      typeof rawObj === 'object' &&
      rawObj['card'] !== null &&
      rawObj['card'] !== undefined
    ) {
      const card = rawObj['card'] as Record<string, unknown>;
      const validKinds = [
        'single_choice',
        'multi_select',
        'yes_no',
        'free_text',
        'confirmation',
      ];
      if (
        !card ||
        typeof card !== 'object' ||
        !validKinds.includes(card['kind'] as string) ||
        !card['cardId']
      ) {
        this.logger.warn(
          `[SmartVisionSetup] Card shape invalid — nulling out card: ${JSON.stringify(card)}`,
        );
        rawObj['card'] = null;
      } else {
        // LLM sometimes returns "prompt" instead of "question" — normalise before Zod parse
        if (card['prompt'] !== undefined && card['question'] === undefined) {
          card['question'] = card['prompt'];
          delete card['prompt'];
        }
      }
    }

    const parsed = VisionTurnEnvelopeSchema.safeParse(rawObj);
    if (!parsed.success) {
      this.logger.warn(
        `[SmartVisionSetup] Zod validation failed: ${JSON.stringify(parsed.error.flatten())}`,
      );
      this.logger.warn(
        `[SmartVisionSetup] Raw parsed object keys: ${Object.keys(rawObj).join(', ')}`,
      );
      this.logger.warn(
        `[SmartVisionSetup] Raw parsed object: ${JSON.stringify(rawObj).slice(0, 2000)}`,
      );
      // Don't throw — the retry prompt rarely helps and triggers the static fallback.
      // Instead return a best-effort envelope: keep message + visionTable, reset card to null.
      const fallback: VisionTurnEnvelope = {
        sessionId:
          (rawObj['sessionId'] as string) ||
          '00000000-0000-0000-0000-000000000000',
        step: (VISION_STEPS.includes(rawObj['step'] as any)
          ? rawObj['step']
          : 'description') as import('./vision-setup-envelope.types').VisionStep,
        stepIndex:
          typeof rawObj['stepIndex'] === 'number' ? rawObj['stepIndex'] : 1,
        totalSteps: 5,
        abigailMessage:
          typeof rawObj['abigailMessage'] === 'string'
            ? rawObj['abigailMessage']
            : 'I had trouble formatting that response. Could you repeat your last answer?',
        card: null,
        visionTable: (rawObj['visionTable'] as any) ?? {
          name: '',
          description: null,
          techStack: {
            locked: [],
            forbidden: [],
            frontend: [],
            backend: [],
            infra: [],
          },
          goals: [],
          constraints: [],
          openQuestions: [],
          status: {
            description: 'in_progress',
            tech_stack: 'pending',
            first_goal: 'pending',
            constraints: 'pending',
            open_questions: 'pending',
          },
        },
        visionReady: false,
      };
      return fallback;
    }
    return parsed.data;
  }

  private deriveStepFromHistory(history: VisionChatTurn[]): VisionStep {
    // Use stepSnapshot stored on the last assistant turn (added after visionTableSnapshot commit).
    // Falls back to count-based heuristic only for old history without snapshots.
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant' && history[i].stepSnapshot) {
        return history[i].stepSnapshot as VisionStep;
      }
    }
    const len = history.filter((h) => h.role === 'assistant').length;
    if (len >= 14) return 'open_questions';
    if (len >= 10) return 'constraints';
    if (len >= 6) return 'first_goal';
    if (len >= 2) return 'tech_stack';
    return 'description';
  }

  private stepIndexOf(step: VisionStep): number {
    return {
      description: 1,
      tech_stack: 2,
      first_goal: 3,
      constraints: 4,
      open_questions: 5,
    }[step];
  }

  private buildVisionTableFromHistory(
    name: string,
    history: VisionChatTurn[],
    brief?: CeoBriefResult,
  ): import('./vision-setup-envelope.types').VisionTableSnapshot {
    // Use the most recent assistant turn's visionTableSnapshot if available —
    // this carries the LLM's own accumulated state from the previous turn.
    const lastAssistantTable =
      [...history]
        .reverse()
        .find((t) => t.role === 'assistant' && t.visionTableSnapshot)
        ?.visionTableSnapshot ?? null;

    const inferredSections = brief?.inferredSections ?? [];

    if (lastAssistantTable) {
      // If CEO brief says a section is inferred/confirmed, enforce it on the snapshot
      // even if the LLM returned a stale status (e.g. tech_stack: pending for non-software).
      if (inferredSections.length === 0) return lastAssistantTable;
      const forcedStatus = { ...lastAssistantTable.status };
      for (const sec of inferredSections) {
        if (sec === 'description') forcedStatus.description = 'confirmed';
        if (sec === 'tech_stack') forcedStatus.tech_stack = 'confirmed';
        if (sec === 'constraints') forcedStatus.constraints = 'confirmed';
      }
      return { ...lastAssistantTable, status: forcedStatus };
    }

    // Fallback: seed from CEO brief on first turn
    return {
      name,
      description: brief?.inferredDescription ?? null,
      techStack: brief?.inferredTechStack ?? {
        locked: [],
        forbidden: [],
        frontend: [],
        backend: [],
        infra: [],
      },
      goals: [],
      constraints: brief?.inferredConstraints ?? [],
      openQuestions: [],
      status: {
        description: inferredSections.includes('description')
          ? 'confirmed'
          : 'in_progress',
        tech_stack: inferredSections.includes('tech_stack')
          ? 'confirmed'
          : 'pending',
        first_goal: 'pending',
        constraints: inferredSections.includes('constraints')
          ? 'confirmed'
          : 'pending',
        open_questions: 'pending',
      },
    };
  }

  private buildStaticFallbackEnvelope(
    currentStep?: VisionStep,
    currentStepIndex?: number,
    currentVisionTable?: import('./vision-setup-envelope.types').VisionTableSnapshot,
  ): VisionTurnEnvelope {
    const step = currentStep ?? 'description';
    const stepIndex = currentStepIndex ?? 1;
    return {
      sessionId: '00000000-0000-0000-0000-000000000000',
      step,
      stepIndex,
      totalSteps: 5,
      abigailMessage:
        'My AI connection had a hiccup. Please try sending your message again.',
      card: null,
      visionTable: currentVisionTable ?? {
        name: '',
        description: null,
        techStack: {
          locked: [],
          forbidden: [],
          frontend: [],
          backend: [],
          infra: [],
        },
        goals: [],
        constraints: [],
        openQuestions: [],
        status: {
          description: 'in_progress',
          tech_stack: 'pending',
          first_goal: 'pending',
          constraints: 'pending',
          open_questions: 'pending',
        },
      },
      visionReady: false,
    };
  }
}
