import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskSession } from '../entities/task-session.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { StepContext } from './pipeline-step.interface';
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
import { ProjectContextService } from '../project-context.service';
import { AgentsService } from '../../agents/agents.service';
import { HermesService } from '../../hermes/hermes.service';
import { McpToolbeltService } from '../../mcp-registry/mcp-toolbelt.service';
import { PrdGeneratorService } from '../../task-prd/prd-generator.service';
import { SkillEngineService } from '../../heartbeat/skill-engine.service';

@Injectable()
export class DispatchContextAssembler {
  private readonly logger = new Logger(DispatchContextAssembler.name);

  constructor(
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly salesGateway: SalesGateway,
    private readonly brainIntentClassifier: BrainIntentClassifierService,
    private readonly brainDispatchGuard: BrainDispatchGuardService,
    private readonly parametricWeightService: ParametricWeightService,
    private readonly gitContextService: GitContextService,
    private readonly visionService: VisionService,
    private readonly unifiedKnowledge: UnifiedKnowledgeService,
    private readonly tokenizerService: TokenizerService,
    private readonly skillService: SkillService,
    private readonly pluginService: PluginService,
    private readonly projectContextService: ProjectContextService,
    private readonly agentsService: AgentsService,
    private readonly hermesService: HermesService,
    private readonly toolbeltService: McpToolbeltService,
    private readonly prdGenerator: PrdGeneratorService,
    private readonly skillEngine: SkillEngineService,
  ) {}

  public async assemble(ctx: StepContext): Promise<StepContext> {
    const p1 = await this.stepIntentClassify(ctx);
    if (p1) Object.assign(ctx, p1);

    const p2 = await this.stepColdStartDetect(ctx);
    if (p2) Object.assign(ctx, p2);

    const p3 = await Promise.allSettled([
      this.stepVisionLoad(ctx),
      this.stepGitContext(ctx),
      this.stepKnowledgeFetch(ctx),
      this.stepChatHistory(ctx),
      this.stepSkillsPlugins(ctx),
    ]);

    p3.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) {
        Object.assign(ctx, res.value);
      }
    });

    const p4 = await this.stepPrdGeneration(ctx);
    if (p4) Object.assign(ctx, p4);

    return ctx;
  }

  // GROUP 2 — INTENT

  public async stepIntentClassify(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const classification = await this.brainIntentClassifier.classify(
      ctx.session.taskDescription,
    );
    if (
      ['feature', 'architecture', 'design', 'new_module'].includes(
        classification.type,
      )
    ) {
      const guard = await this.brainDispatchGuard.check(
        ctx.session.teamId,
        ctx.session.userId,
      );
      if (guard.held) {
        this.salesGateway.emitTaskFailed?.({
          teamId: ctx.session.teamId,
          userId: ctx.session.userId,
          sessionId: ctx.session.id,
          specialist: ctx.session.specialist,
          error:
            'Brainstorm incomplete. Please complete the ideation session first.',
        });
        throw new Error('Brainstorm incomplete');
      }
    }
    return undefined;
  }

  public async stepColdStartDetect(
    ctx: StepContext,
  ): Promise<Partial<StepContext> | undefined> {
    const weightCount = await this.parametricWeightService.countActiveWeights(
      ctx.session.teamId,
    );
    const threshold = process.env.BOOTSTRAP_WEIGHT_THRESHOLD
      ? parseInt(process.env.BOOTSTRAP_WEIGHT_THRESHOLD)
      : 10;
    if (weightCount < threshold) {
      ctx.session.context = { ...ctx.session.context, bootstrapMode: true };
    }
    return undefined;
  }

  // GROUP 3 — CONTEXT (all run in parallel via Promise.allSettled)

  public async stepVisionLoad(ctx: StepContext): Promise<Partial<StepContext>> {
    const vision = await this.visionService.getVision(ctx.session.projectId);
    if (!vision)
      throw new Error(`No vision for project ${ctx.session.projectId}`);

    const coordinator = await this.agentsService.findCoordinatorForTenant(
      ctx.session.teamId,
    );
    const activeMcps = await this.toolbeltService.getToolbeltForSpecialist(
      ctx.session.specialist,
      ctx.session.teamId,
    );
    const mcpList =
      activeMcps.map((m) => `  • ${m.name}`).join('\n') || '  • None';

    const currentGoal =
      vision.goals?.find((g: any) => g.id === (ctx.session as any).goalId) ||
      vision.goals?.find((g: any) => g.status === 'in_progress');

    const summary =
      `PROJECT VISION SUMMARY\n======================\nProject: ${vision.name}\nCoordinator: ${coordinator ? coordinator.name : 'Not assigned'}\nStack (locked): ${vision.techStack?.locked?.join(', ')}\nStack (forbidden): ${vision.techStack?.forbidden?.join(', ')}\nFrontend: ${vision.techStack?.frontend?.join(', ')}\nBackend: ${vision.techStack?.backend?.join(', ')}\n\nCurrent goal: ${currentGoal ? `${currentGoal.id} — ${currentGoal.title}` : 'N/A'}\n\nConstraints:\n${vision.constraints?.map((c: string) => `  • ${c}`).join('\n')}\n\nMCP servers active:\n${mcpList}`.trim();

    const goalAncestry = currentGoal
      ? {
          taskTitle: ctx.session.taskDescription.substring(0, 200),
          goalId: currentGoal.id,
          goalTitle: currentGoal.title,
          goalDescription: currentGoal.description,
          goalProgress: currentGoal.progress,
          projectName: vision.name,
          projectDescription: vision.description,
        }
      : null;

    const userState = await this.hermesService.getUserState(
      ctx.session.teamId,
      ctx.session.userId,
    );

    const BASE_TOKENS = ctx.session.team === 'coding' ? 12000 : 8000;
    const budget =
      BASE_TOKENS * ((ctx.session.context as any)?.taskSizeMultiplier || 1);
    const finalVision = this.tokenizerService
      .fitToWindow(
        this.tokenizerService.chunk(summary),
        Math.floor(budget * 0.05),
      )
      .join('\n');

    return {
      vision,
      coordinator,
      goalAncestry,
    };
  }

  public async stepGitContext(ctx: StepContext): Promise<Partial<StepContext>> {
    const gitContext = await this.gitContextService.getContext(
      ctx.session.projectId,
      ctx.session.teamId,
      ctx.session.taskDescription,
    );
    if (gitContext)
      ctx.session.context = { ...ctx.session.context, gitContext };
    return {};
  }

  public async stepKnowledgeFetch(
    ctx: StepContext,
  ): Promise<Partial<StepContext>> {
    const knowledge = await this.unifiedKnowledge.getUnifiedKnowledge(
      ctx.session.teamId,
      ctx.session.taskDescription,
    );
    const BASE_TOKENS = ctx.session.team === 'coding' ? 12000 : 8000;
    const budget =
      BASE_TOKENS * ((ctx.session.context as any)?.taskSizeMultiplier || 1);
    const finalKnowledge = this.tokenizerService
      .fitToWindow(
        this.tokenizerService.chunk(knowledge || ''),
        Math.floor(budget * 0.5),
      )
      .join('\n');
    return { companyKnowledge: finalKnowledge };
  }

  public async stepChatHistory(
    ctx: StepContext,
  ): Promise<Partial<StepContext>> {
    const rawMessages = await this.chatRepo.find({
      where: { projectId: ctx.session.projectId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    const BASE_TOKENS = ctx.session.team === 'coding' ? 12000 : 8000;
    const budget =
      BASE_TOKENS * ((ctx.session.context as any)?.taskSizeMultiplier || 1);
    const chatStrs = rawMessages.map(
      (m: any) => `[${m.agentName}] ${m.content}`,
    );
    const finalChat = this.tokenizerService
      .fitToWindow(chatStrs, Math.floor(budget * 0.2))
      .join('\n');
    return { chatHistory: finalChat };
  }

  public async stepSkillsPlugins(
    ctx: StepContext,
  ): Promise<Partial<StepContext>> {
    const team = ctx.session.team ?? 'coding';

    const [skillsText, pluginsText, projectContext, soulText] =
      await Promise.all([
        this.skillService
          .assembleSkillsPrompt(
            ctx.session.teamId,
            ctx.session.specialist,
            team,
          )
          .catch(() => ''),
        this.pluginService
          .assemblePluginToolsPrompt(ctx.session.teamId, team)
          .catch(() => ''),
        this.projectContextService
          .getProjectContext(ctx.session.projectId, ctx.session.teamId)
          .catch(() => null),
        this.skillEngine.load(team).catch(() => ''),
      ]);

    const combinedSkills = [skillsText, soulText]
      .filter(Boolean)
      .join('\n\n---\n\n');

    // Inject assembled context into session context for specialist pickup
    ctx.session.context = {
      ...ctx.session.context,
      visionSummary: ctx.vision
        ? JSON.stringify(ctx.vision).substring(0, 2000)
        : undefined,
      companyKnowledge: ctx.companyKnowledge,
      chatHistory: ctx.chatHistory,
      skillsContext: combinedSkills,
      pluginsContext: pluginsText,
      goalAncestry: ctx.goalAncestry,
      specKit: projectContext?.specKit,
    } as any;

    return { skillsContext: combinedSkills, pluginsContext: pluginsText };
  }

  // GROUP 4 — PRD

  public async stepPrdGeneration(
    ctx: StepContext,
  ): Promise<Partial<StepContext>> {
    const prdContext = await this.prdGenerator.generatePrd(
      ctx.session,
      ctx.goalAncestry,
    );
    ctx.session.context = {
      ...ctx.session.context,
      prdContext: prdContext as any,
    };
    await this.sessionRepo.save(ctx.session);
    return { prdContext };
  }
}
