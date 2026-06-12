import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import { BrainSessionService } from '../../abigail-brain/brain-session.service';
import { BrainIntentClassifierService } from '../../abigail-brain/brain-intent-classifier.service';
import { BrainToVisionBridgeService } from './brain-to-vision-bridge.service';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { UserLlmResolverService } from '../../ai-integration/user-llm-resolver.service';
import { VisionInterviewTurn } from './vision-interview.types';
import { BrainIdea } from '../../abigail-brain/entities/brain-idea.entity';

@Injectable()
export class VisionInterviewService {
  private readonly logger = new Logger(VisionInterviewService.name);
  private readonly protocolPath = path.resolve(
    process.cwd(),
    '..',
    'agents',
    'rules',
    'vision-interview-protocol.md',
  );

  constructor(
    private readonly brainSession: BrainSessionService,
    @InjectRepository(BrainIdea)
    private readonly ideaRepo: Repository<BrainIdea>,
    private readonly classifier: BrainIntentClassifierService,
    private readonly bridge: BrainToVisionBridgeService,
    private readonly aiRouter: AiProviderRouter,
    private readonly userLlmResolver: UserLlmResolverService,
  ) {}

  async start(
    projectId: string,
    tenantId: string,
    userId: string,
    name: string,
    desc: string,
  ): Promise<VisionInterviewTurn> {
    // Resume existing session if one is active for this project
    const existing = await this.brainSession.getActiveForProject(
      tenantId,
      projectId,
    );
    if (existing) {
      const lastIdea = await this.getLastAssistantMessage(
        existing.id,
        tenantId,
      );
      return {
        sessionId: existing.id,
        message: lastIdea ?? 'Tell me about your project.',
        visionReady: false,
      };
    }

    const protocol = this.readProtocol();
    const model = await this.resolveModel(userId, tenantId);

    let interviewPlan: { topics: string[]; openingQuestion: string };
    try {
      const callLlm = async (extraInstructions = '') => {
        const { text } = await generateText({
          model,
          maxOutputTokens: 1000,
          providerOptions: {
            google: { thinkingConfig: { thinkingBudget: 0 } },
            deepseek: { thinking: { type: 'disabled' } },
          },
          messages: [
            {
              role: 'system',
              content: `You are Abigail CEO conducting a project discovery interview.
Read the protocol and decide which topics apply to this project.
Return ONLY JSON: { "topics": string[], "openingQuestion": string }
${extraInstructions}

Protocol:
${protocol}`,
            },
            {
              role: 'user',
              content: `Project name: "${name}"\nDescription: "${desc}"`,
            },
          ],
        });
        return text;
      };

      const planText = await callLlm();
      try {
        interviewPlan = JSON.parse(
          planText
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, ''),
        );
      } catch (parseErr) {
        this.logger.warn(
          `[VisionInterview] plan parse failed, retrying once: ${parseErr.message}`,
        );
        const retryText = await callLlm(
          '\n\nReturn ONLY the JSON object, no other text.',
        );
        interviewPlan = JSON.parse(
          retryText
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, ''),
        );
      }
    } catch (err) {
      this.throwIfLlmKeyError(err);
      this.logger.warn(
        `[VisionInterview] plan generation failed, using default: ${(err as Error).message}`,
      );
      interviewPlan = {
        topics: ['project_identity', 'purpose_and_user', 'first_milestone'],
        openingQuestion: `Tell me about "${name}" — what does it do and who is it for?`,
      };
    }

    const session = await this.brainSession.openForProject({
      tenantId,
      projectId,
      topic: name,
      intentType: 'feature',
    });

    // Store interview plan + opening question as first idea (batchNumber 0 = assistant turn)
    const planStr = JSON.stringify(interviewPlan);
    await this.brainSession.addIdea(
      session.id,
      tenantId,
      `[PLAN]${planStr}`,
      0,
    );
    await this.brainSession.addIdea(
      session.id,
      tenantId,
      interviewPlan.openingQuestion,
      0,
    );

    return {
      sessionId: session.id,
      message: interviewPlan.openingQuestion,
      visionReady: false,
    };
  }

  async chat(
    sessionId: string,
    projectId: string,
    tenantId: string,
    userId: string,
    userMessage: string,
  ): Promise<VisionInterviewTurn> {
    // Off-topic guard: only block explicit coding task requests (bugfix, new_module)
    // NOT conversational or query — those are natural answers to interview questions
    const intent = await this.classifier.classify(userMessage);
    if (['bugfix', 'new_module'].includes(intent.type)) {
      return {
        sessionId,
        message: `Let's hold that thought — we can work on that once the project vision is in place. Right now, let's keep defining what you're building.`,
        visionReady: false,
      };
    }

    // Save user message
    const ideas = await this.getAllIdeas(sessionId, tenantId);
    // batchNumber=0 = assistant; odd (1,3,5,...) = user turns. The Nth user
    // turn must be saved as 2N-1 so it stays odd — `count + 1` produced even
    // numbers from turn 2 onward, freezing the turn counter at 1 forever.
    const priorUserTurns = ideas.filter(
      (i) =>
        !i.content.startsWith('[PLAN]') &&
        i.batchNumber > 0 &&
        i.batchNumber % 2 === 1,
    ).length;
    const userTurn = priorUserTurns * 2 + 1;
    await this.brainSession.addIdea(sessionId, tenantId, userMessage, userTurn);

    // Extract interview plan from first idea
    const planIdea = ideas.find((i) => i.content.startsWith('[PLAN]'));
    const interviewPlan = planIdea
      ? JSON.parse(planIdea.content.slice('[PLAN]'.length))
      : { topics: ['project_identity', 'purpose_and_user', 'first_milestone'] };

    const protocol = this.readProtocol();
    const completionSignals = this.extractSection(
      protocol,
      '## Completion Signals',
    );
    const transcript = ideas
      .filter((i) => !i.content.startsWith('[PLAN]'))
      .map((i) => i.content)
      .concat(userMessage)
      .join('\n\n');

    // If ≥ 6 user turns have passed, complete the vision regardless.
    const userTurnCount = priorUserTurns;

    const model = await this.resolveModel(userId, tenantId);
    let response: { nextQuestion: string | null; visionReady: boolean };

    if (userTurnCount >= 6) {
      // Force completion after enough context has been collected.
      response = { nextQuestion: null, visionReady: true };
    } else {
      try {
        const callNextQuestionLlm = async (extraInstructions = '') => {
          const { text } = await generateText({
            model,
            maxOutputTokens: 1000,
            providerOptions: {
              google: { thinkingConfig: { thinkingBudget: 0 } },
              deepseek: { thinking: { type: 'disabled' } },
            },
            messages: [
              {
                role: 'system',
                content: `You are Abigail CEO conducting a project discovery interview.
Interview plan (topics to cover): ${JSON.stringify(interviewPlan.topics)}

Completion signals:
${completionSignals}

Review the conversation. Is the vision complete, or is there one more question to ask?
Return ONLY JSON: { "nextQuestion": string | null, "visionReady": boolean }
${extraInstructions}
- nextQuestion: null if visionReady is true
- nextQuestion must NOT repeat or rephrase a question already asked in the conversation
- Start nextQuestion by briefly acknowledging the user's last answer, add one short helpful suggestion when you have one, then ask the next question — 2 sentences max, conversational`,
              },
              {
                role: 'user',
                content: `Conversation so far:\n\n${transcript}`,
              },
            ],
          });
          return text;
        };

        const nextQuestionText = await callNextQuestionLlm();
        try {
          const cleaned = nextQuestionText
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          response = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        } catch (parseErr) {
          this.logger.warn(
            `[VisionInterview] next-question parse failed, retrying once: ${parseErr.message}`,
          );
          const retryText = await callNextQuestionLlm(
            '\n\nReturn ONLY the JSON object, no other text.',
          );
          const cleaned = retryText
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          response = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        }
      } catch (err) {
        this.throwIfLlmKeyError(err);
        this.logger.warn(
          `[VisionInterview] next-question call failed: ${(err as Error).message}`,
        );
        // Fall forward after enough turns, otherwise ask a generic follow-up
        // that progresses with the turn count instead of repeating itself.
        response =
          userTurnCount >= 3
            ? { nextQuestion: null, visionReady: true }
            : {
                nextQuestion:
                  VisionInterviewService.FALLBACK_QUESTIONS[
                    Math.min(
                      userTurnCount,
                      VisionInterviewService.FALLBACK_QUESTIONS.length - 1,
                    )
                  ],
                visionReady: false,
              };
      }
    }

    if (response.visionReady) {
      const closing = `Thank you — I have everything I need. Building your project vision now.`;
      await this.brainSession.addIdea(sessionId, tenantId, closing, 0);

      const { visionFile, suggestedTasks } = await this.bridge.bridge(
        sessionId,
        projectId,
        tenantId,
        userId,
      );
      return {
        sessionId,
        message: closing,
        visionReady: true,
        finalVision: visionFile,
        suggestedTasks,
      };
    }

    const nextQuestion =
      response.nextQuestion ?? 'What else should I know about your project?';
    await this.brainSession.addIdea(sessionId, tenantId, nextQuestion, 0);
    return { sessionId, message: nextQuestion, visionReady: false };
  }

  /** Turn-indexed fallbacks for transient LLM failures — never repeats. */
  private static readonly FALLBACK_QUESTIONS = [
    'What is the primary goal you want to achieve with this project?',
    'Got it. Who will use this, and what should their experience feel like?',
    'Thanks — last one: what would a successful first milestone look like?',
  ];

  /**
   * Auth/key failures (revoked, leaked, invalid) can never succeed on retry.
   * Surface them to the user instead of pretending the interview continues
   * with a canned question (Rule 27: fail loud).
   */
  private throwIfLlmKeyError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const isKeyError =
      statusCode === 401 ||
      statusCode === 403 ||
      /api key|unauthorized|permission denied|leaked/i.test(message);
    if (!isKeyError) return;
    this.logger.error(`[VisionInterview] LLM key rejected: ${message}`);
    // 400, not 401 — the frontend axios interceptor treats 401 as an expired
    // JWT and silently refreshes + retries, so the key card would never show.
    throw new HttpException(
      'Your LLM provider rejected the API key (it may have been revoked or reported as leaked). Please add your API key again in LLM Settings.',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async resolveModel(userId: string, _tenantId: string) {
    const userModel = await this.userLlmResolver.resolveModel(userId);
    return userModel ?? this.aiRouter.getModel('researcher');
  }

  private readProtocol(): string {
    return fs.existsSync(this.protocolPath)
      ? fs.readFileSync(this.protocolPath, 'utf-8')
      : '';
  }

  private extractSection(text: string, heading: string): string {
    const idx = text.indexOf(heading);
    if (idx === -1) return '';
    const next = text.indexOf('\n## ', idx + heading.length);
    return next === -1 ? text.slice(idx) : text.slice(idx, next);
  }

  private async getAllIdeas(
    sessionId: string,
    tenantId: string,
  ): Promise<BrainIdea[]> {
    return this.ideaRepo.find({
      where: { sessionId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  private async getLastAssistantMessage(
    sessionId: string,
    tenantId: string,
  ): Promise<string | null> {
    const ideas = await this.getAllIdeas(sessionId, tenantId);
    const assistantMessages = ideas.filter(
      (i) => !i.content.startsWith('[PLAN]') && i.batchNumber === 0,
    );
    return assistantMessages[assistantMessages.length - 1]?.content ?? null;
  }
}
