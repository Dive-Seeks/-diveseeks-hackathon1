import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { BrainSession, BrainIntentType } from './entities/brain-session.entity';
import { BrainIdea } from './entities/brain-idea.entity';
import { BrainThread } from './entities/brain-thread.entity';
import { BrainTechniqueService } from './brain-technique.service';
import { AiIntegrationService } from '../ai-integration/ai-integration.service';
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { PromptResolverService } from '../prompt-engine/services/prompt-resolver.service';

@Injectable()
export class BrainSessionService {
  private readonly logger = new Logger(BrainSessionService.name);

  constructor(
    @InjectRepository(BrainSession)
    private readonly sessionRepo: Repository<BrainSession>,
    @InjectRepository(BrainIdea)
    private readonly ideaRepo: Repository<BrainIdea>,
    @InjectRepository(BrainThread)
    private readonly threadRepo: Repository<BrainThread>,
    private readonly techniqueService: BrainTechniqueService,
    @Optional() private readonly aiService?: AiIntegrationService,
    @Optional() private readonly promptResolver?: PromptResolverService,
  ) {}

  async open(params: {
    topic: string;
    intentType: BrainIntentType;
    tenantId: string;
    userId: string;
  }): Promise<BrainSession> {
    const technique = this.techniqueService.selectTechnique(params.intentType);
    const session = this.sessionRepo.create({
      ...params,
      technique,
      state: 'ideating',
    });
    return this.sessionRepo.save(session);
  }

  async openForProject(params: {
    tenantId: string;
    projectId: string;
    topic: string;
    intentType: BrainIntentType;
    userId?: string;
  }): Promise<BrainSession> {
    const technique = this.techniqueService.selectTechnique(params.intentType);
    const session = this.sessionRepo.create({
      tenantId: params.tenantId,
      projectId: params.projectId,
      userId: params.userId ?? '00000000-0000-0000-0000-000000000000',
      topic: params.topic,
      intentType: params.intentType,
      technique,
      state: 'ideating',
    });
    return this.sessionRepo.save(session);
  }

  async findOne(id: string, tenantId: string): Promise<BrainSession> {
    const session = await this.sessionRepo.findOne({ where: { id, tenantId } });
    if (!session) throw new NotFoundException(`Brain session ${id} not found`);
    return session;
  }

  async addIdea(
    id: string,
    tenantId: string,
    content: string,
    batchNumber = 1,
  ): Promise<BrainIdea> {
    const session = await this.findOne(id, tenantId);
    const idea = this.ideaRepo.create({
      sessionId: id,
      tenantId,
      threadName: session.currentThread,
      content,
      batchNumber,
    });
    await this.ideaRepo.save(idea);
    session.ideaCount += 1;
    await this.sessionRepo.save(session);
    return idea;
  }

  async fork(
    id: string,
    tenantId: string,
    name: string,
    topic: string,
  ): Promise<BrainThread> {
    const session = await this.findOne(id, tenantId);
    const thread = this.threadRepo.create({
      sessionId: id,
      name,
      parentThread: session.currentThread,
      topic,
    });
    await this.threadRepo.save(thread);
    session.threadStack = [...session.threadStack, name];
    session.currentThread = name;
    session.forkCount += 1;
    await this.sessionRepo.save(session);
    return thread;
  }

  async back(id: string, tenantId: string): Promise<BrainSession> {
    const session = await this.findOne(id, tenantId);
    if (session.threadStack.length <= 1) return session;
    const newStack = [...session.threadStack];
    newStack.pop();
    session.threadStack = newStack;
    session.currentThread = newStack[newStack.length - 1];
    return this.sessionRepo.save(session);
  }

  async complete(id: string, tenantId: string): Promise<BrainSession> {
    const session = await this.findOne(id, tenantId);
    const ideas = await this.ideaRepo.find({
      where: { sessionId: id, tenantId },
      order: { createdAt: 'ASC' },
    });
    session.state = 'complete';
    session.completedAt = new Date();
    session.summary = await this.generateSummary(session, ideas);
    return this.sessionRepo.save(session);
  }

  private async generateSummary(
    session: BrainSession,
    ideas: BrainIdea[],
  ): Promise<string> {
    if (!ideas.length) {
      return `Brainstorm for "${session.topic}" completed with no recorded ideas.`;
    }

    const byThread: Record<string, string[]> = {};
    for (const idea of ideas) {
      if (!byThread[idea.threadName]) byThread[idea.threadName] = [];
      byThread[idea.threadName].push(idea.content);
    }

    const ideasText = Object.entries(byThread)
      .map(
        ([thread, contents]) =>
          `[${thread}]\n${contents.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
      )
      .join('\n\n');

    // ── Resolved system prompt ────────────────────────────────────────────────
    let systemPrompt: string | undefined;
    if (this.promptResolver) {
      try {
        systemPrompt = await this.promptResolver.resolveForRole(
          'brain-summarizer',
          session.tenantId,
          { topic: session.topic, technique: session.technique },
        );
      } catch {
        // No prompt for this role — fall through to hardcoded default
      }
    }
    const defaultSystemPrompt = `You are summarizing a brainstorming session. Topic: "${session.topic}". Technique: ${session.technique}.\n\nIdeas generated:\n${ideasText}\n\nWrite a concise summary (3-5 sentences) covering: the strongest ideas, key themes, and one recommended direction. Be direct and specific.`;
    const resolvedPrompt = systemPrompt
      ? `${systemPrompt}\n\n${ideasText}`
      : defaultSystemPrompt;
    // ─────────────────────────────────────────────────────────────────────────

    if (this.aiService) {
      try {
        const config = await this.aiService.getConfig(session.userId);
        if (config.configured && config.openRouterApiKey) {
          const openrouter = createOpenRouter({
            apiKey: config.openRouterApiKey,
          });
          const model = config.model || 'google/gemini-2.5-flash';
          const { text } = await generateText({
            model: openrouter(model),
            maxOutputTokens: 400,
            prompt: resolvedPrompt,
          });
          return text;
        }
      } catch (err) {
        this.logger.warn(
          'Brain summary LLM call failed, using structured fallback',
          err,
        );
      }
    }

    const threadSummaries = Object.entries(byThread)
      .map(
        ([thread, contents]) => `${thread}: ${contents.slice(0, 3).join('; ')}`,
      )
      .join(' | ');
    const ideaWord = ideas.length === 1 ? 'idea' : 'ideas';
    return `Brainstorm for "${session.topic}" (${session.technique}). ${ideas.length} ${ideaWord} across ${Object.keys(byThread).length} thread(s). Key ideas: ${threadSummaries}.`;
  }

  async dismissAllIdeating(tenantId: string, userId: string): Promise<void> {
    await this.sessionRepo.update(
      { tenantId, userId, state: 'ideating' },
      {
        state: 'complete',
        completedAt: new Date(),
        summary: 'Dismissed — vision interview completed brainstorming.',
      },
    );
  }

  async getActive(
    tenantId: string,
    userId: string,
  ): Promise<BrainSession | null> {
    return this.sessionRepo.findOne({
      where: { tenantId, userId, state: 'ideating' },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveForProject(
    tenantId: string,
    projectId: string,
  ): Promise<BrainSession | null> {
    return this.sessionRepo.findOne({
      where: { tenantId, projectId, state: 'ideating' },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentlyCompleted(
    tenantId: string,
    userId: string,
    minutes = 5,
  ): Promise<BrainSession | null> {
    const threshold = new Date(Date.now() - minutes * 60 * 1000);
    return this.sessionRepo.findOne({
      where: {
        tenantId,
        userId,
        state: 'complete',
        completedAt: MoreThanOrEqual(threshold),
      },
      order: { completedAt: 'DESC' },
    });
  }

  async getRecentlyCompletedForProject(
    tenantId: string,
    projectId: string,
    minutes = 5,
  ): Promise<BrainSession | null> {
    const threshold = new Date(Date.now() - minutes * 60 * 1000);
    return this.sessionRepo.findOne({
      where: {
        tenantId,
        projectId,
        state: 'complete',
        completedAt: MoreThanOrEqual(threshold),
      },
      order: { completedAt: 'DESC' },
    });
  }
}
