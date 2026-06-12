import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { generateText } from 'ai';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { VisionService } from './vision.service';
import { VisionFile } from './vision.types';

/**
 * Section 3 — Vision File Schema
 *
 * A project vision requires the following fields in order:
 *   1. name           — project name
 *   2. description    — what the project does / business context (one paragraph)
 *   3. techStack      — locked, forbidden, frontend, backend, infra categories
 *   4. goals[]        — at least one goal: id, title, description, status
 *   5. constraints[]  — hard rules every specialist must follow
 *   6. openQuestions[] — things not yet decided (optional)
 *
 * This service drives a structured conversational flow through all 5 sections,
 * validates completeness against the schema, and persists the final vision file.
 */

export const VISION_SECTIONS = [
  'description',
  'tech_stack',
  'first_goal',
  'constraints',
  'open_questions',
] as const;

export type VisionSection = (typeof VISION_SECTIONS)[number];

export interface VisionChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VisionChatInput {
  projectId: string;
  projectName: string;
  tenantId: string;
  userId: string;
  history: VisionChatMessage[];
  /** Free-text message from the user for this turn */
  userMessage: string;
}

export interface VisionChatOutput {
  /** Abigail's reply — shown in the chat UI */
  reply: string;
  /** Current section being filled */
  currentSection: VisionSection;
  /** Partial vision accumulated so far */
  partialVision: Partial<VisionFile>;
  /** True once all 5 sections are confirmed and the vision file has been saved */
  visionComplete: boolean;
  /** Populated when visionComplete = true */
  savedVision?: VisionFile;
}

const SECTION_PROMPTS: Record<VisionSection, string> = {
  description:
    "Great, let's define this project's vision. First — what does this project do? Give me one paragraph describing the product and its business context.",
  tech_stack:
    'What is your tech stack? Tell me:\n- Locked: technologies that CANNOT be changed\n- Forbidden: technologies explicitly banned\n- Frontend / Backend / Infra layers',
  first_goal:
    "Let's define your first goal. What is the single most important outcome you need to deliver? Give it a short title and a clear description.",
  constraints:
    'What are the hard rules every team member must follow? (e.g. "always filter by tenant_id", "no external APIs without approval")',
  open_questions:
    'Finally, what is still undecided? List any open questions. You can leave this empty if everything is clear.',
};

const SYSTEM_PROMPT = `You are Abigail, a senior architect helping a developer define a project vision.
You guide them through 5 sections in order: description → tech_stack → first_goal → constraints → open_questions.
Ask one section at a time. Summarize what you captured after each answer before moving on.
When all sections are complete, output a JSON block wrapped in triple backticks tagged as "vision_complete" like:
\`\`\`vision_complete
{ ...VisionFile JSON here... }
\`\`\`
Do not output vision_complete until all 5 sections have confirmed answers.`;

@Injectable()
export class VisionChatService {
  private readonly logger = new Logger(VisionChatService.name);

  constructor(
    private readonly aiRouter: AiProviderRouter,
    private readonly visionService: VisionService,
  ) {}

  async chat(input: VisionChatInput): Promise<VisionChatOutput> {
    const model = this.aiRouter.getModel('chat');

    const currentSection = this.deriveCurrentSection(input.history);

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...input.history,
      { role: 'user', content: input.userMessage },
    ];

    // If this is the very first turn, Abigail opens with the description prompt
    if (input.history.length === 0) {
      const openingReply = SECTION_PROMPTS.description;
      return {
        reply: openingReply,
        currentSection: 'description',
        partialVision: { name: input.projectName, projectId: input.projectId },
        visionComplete: false,
      };
    }

    const result = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = result.text;

    // Check if the LLM signalled vision completion
    const visionMatch = reply.match(/```vision_complete\s*([\s\S]*?)```/);

    if (visionMatch) {
      try {
        const rawVision = JSON.parse(visionMatch[1].trim()) as VisionFile;
        this.validateVisionSchema(
          rawVision,
          input.projectId,
          input.projectName,
        );
        const saved = await this.visionService.updateVision(
          input.projectId,
          rawVision,
        );
        this.logger.log(
          `[VisionChat] Vision complete and saved for project ${input.projectId}`,
        );
        return {
          reply: reply.replace(/```vision_complete[\s\S]*?```/, '').trim(),
          currentSection: 'open_questions',
          partialVision: saved,
          visionComplete: true,
          savedVision: saved,
        };
      } catch (err) {
        this.logger.error(
          `[VisionChat] Vision JSON parse/validation failed: ${(err as Error).message}`,
        );
        return {
          reply:
            'I tried to finalise your vision but the output had a format issue. Could you confirm your open questions one more time so I can retry?',
          currentSection: 'open_questions',
          partialVision: {},
          visionComplete: false,
        };
      }
    }

    // Derive partial vision state from conversation
    const partial = this.extractPartialVision(
      input.projectId,
      input.projectName,
      input.history,
      input.userMessage,
      reply,
    );

    return {
      reply,
      currentSection,
      partialVision: partial,
      visionComplete: false,
    };
  }

  /**
   * Returns the current section based on conversation length heuristic.
   * The LLM drives the actual ordering; this is a UI progress indicator only.
   */
  private deriveCurrentSection(history: VisionChatMessage[]): VisionSection {
    const assistantTurns = history.filter((h) => h.role === 'assistant').length;
    if (assistantTurns <= 1) return 'description';
    if (assistantTurns <= 2) return 'tech_stack';
    if (assistantTurns <= 3) return 'first_goal';
    if (assistantTurns <= 4) return 'constraints';
    return 'open_questions';
  }

  private extractPartialVision(
    projectId: string,
    projectName: string,
    _history: VisionChatMessage[],
    _userMessage: string,
    _assistantReply: string,
  ): Partial<VisionFile> {
    // Lightweight partial extraction — the LLM owns the authoritative state.
    // Full extraction only happens at vision_complete.
    return { projectId, name: projectName };
  }

  /**
   * Validates the vision JSON the LLM emitted against the Section 3 schema.
   * Throws if required fields are missing so we can ask the user to retry.
   */
  private validateVisionSchema(
    vision: Partial<VisionFile>,
    projectId: string,
    projectName: string,
  ): asserts vision is VisionFile {
    const errors: string[] = [];

    if (!vision.name) vision.name = projectName;
    vision.projectId = projectId;

    if (!vision.description || vision.description.length < 10) {
      errors.push('description is required (min 10 chars)');
    }

    const stack = vision.techStack;
    if (
      !stack ||
      !Array.isArray(stack.locked) ||
      !Array.isArray(stack.forbidden) ||
      !Array.isArray(stack.frontend) ||
      !Array.isArray(stack.backend) ||
      !Array.isArray(stack.infra)
    ) {
      errors.push(
        'techStack must have locked, forbidden, frontend, backend, infra arrays',
      );
    }

    if (!Array.isArray(vision.goals) || vision.goals.length === 0) {
      errors.push('goals must have at least one entry');
    } else {
      for (const g of vision.goals) {
        if (!g.id || !g.title || !g.description || !g.status) {
          errors.push(
            `goal "${g.title ?? 'unnamed'}" missing id, title, description, or status`,
          );
        }
      }
    }

    if (!Array.isArray(vision.constraints)) {
      errors.push('constraints must be an array');
    }

    if (!Array.isArray(vision.openQuestions)) {
      vision.openQuestions = [];
    }

    if (errors.length > 0) {
      throw new Error(`Vision schema validation failed: ${errors.join('; ')}`);
    }

    const now = new Date().toISOString();
    vision.createdAt = vision.createdAt ?? now;
    vision.lastUpdatedAt = now;
    vision.version = (vision.version ?? 0) + 1;
  }

  /** Returns the opening prompt for a fresh project — used when history is empty */
  getOpeningMessage(projectName: string): string {
    return `I'll help you define the vision for **${projectName}**. We'll go through 5 sections together: description, tech stack, first goal, constraints, and open questions.\n\n${SECTION_PROMPTS.description}`;
  }
}
