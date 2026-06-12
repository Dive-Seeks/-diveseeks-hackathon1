import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { EVOLVE_MODELS } from '../../common/ai-models.constants';
import { ReasoningPromptBuilder } from './reasoning-prompt.builder';
import { CaiEvaluatorService } from './cai-evaluator.service';
import { RoutingService } from '../routing.service';
import { ReasoningInput, ReasoningResult, SAFE_PAIRS } from './reasoning.types';
import { SpecialistId } from '../entities/task-session.entity';

@Injectable()
export class ReasoningService {
  private readonly logger = new Logger(ReasoningService.name);

  constructor(
    private readonly promptBuilder: ReasoningPromptBuilder,
    private readonly caiEvaluator: CaiEvaluatorService,
    private readonly routingService: RoutingService,
  ) {}

  async decompose(input: ReasoningInput): Promise<ReasoningResult> {
    this.logger.log(
      `Step 3C: Decomposing request: "${input.message.substring(0, 50)}..."`,
    );

    // Step 1 — CAI evaluation (deterministic, zero LLM cost)
    const caiResult = this.caiEvaluator.evaluate(input.message, input.tenantId);
    if (caiResult.hardBlocked) {
      this.logger.warn(
        `Request hard-blocked by CAI: ${caiResult.blockReason?.injectorId}`,
      );
      return {
        primarySpecialist: 'rex', // Dummy, won't be used
        alsoSpecialist: null,
        subTasks: [],
        confidence: 0,
        usedReasoning: false,
        reasoningTrace: [],
        caiFlags: caiResult.activeFlags,
        blockedBy: caiResult.blockReason,
      };
    }

    // Step 2 — Build governed prompt (Master Grid pattern)
    const prompt = this.promptBuilder.build(input, caiResult.activeFlags);

    // Step 3 — Haiku 4.5 / Gemini Flash call
    let text: string;
    try {
      const result = await generateText({
        model: google(EVOLVE_MODELS.WEAK_SOLVER),
        system: prompt.system,
        prompt: prompt.user,
        maxTokens: 300,
      } as any);
      text = result.text;
    } catch (error) {
      this.logger.error(
        `Failed to call LLM for reasoning: ${error.message || error}`,
        error.stack,
      );
      // Fallback to keyword routing on API error
      const fallback = this.routingService.mapIntent(input.message);
      return {
        primarySpecialist: fallback.specialist,
        alsoSpecialist: fallback.alwaysAlso || null,
        subTasks: [input.message],
        confidence: 0,
        usedReasoning: false,
        reasoningTrace: [
          { step: 1, thought: 'LLM call failed, falling back to keywords' },
        ],
        caiFlags: caiResult.activeFlags,
      };
    }

    // Step 4 — Parse structured output
    const parsed = this.parseReasoningOutput(text);

    // Step 5 — Confidence gate (EP-008, CAI-013)
    if (parsed.confidence < 0.7) {
      this.logger.log(
        `Low reasoning confidence (${parsed.confidence}), falling back to keyword routing.`,
      );
      const fallback = this.routingService.mapIntent(input.message);
      return {
        primarySpecialist: fallback.specialist,
        alsoSpecialist: fallback.alwaysAlso || null,
        subTasks: [input.message],
        confidence: parsed.confidence,
        usedReasoning: false,
        reasoningTrace: parsed.thoughts,
        caiFlags: caiResult.activeFlags,
      };
    }

    // Step 6 — Safe pair enforcement
    const safePair = this.enforceSafePair(
      parsed.primarySpecialist,
      parsed.alsoSpecialist,
    );

    return {
      primarySpecialist: safePair.primarySpecialist,
      alsoSpecialist: safePair.alsoSpecialist,
      subTasks: parsed.subTasks,
      confidence: parsed.confidence,
      usedReasoning: true,
      reasoningTrace: parsed.thoughts,
      caiFlags: caiResult.activeFlags,
    };
  }

  private parseReasoningOutput(text: string): {
    thoughts: { step: number; thought: string }[];
    primarySpecialist: SpecialistId;
    alsoSpecialist: SpecialistId | null;
    subTasks: string[];
    confidence: number;
  } {
    try {
      // Find JSON block if LLM added markdown
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(jsonStr);

      return {
        thoughts: data.thoughts || [],
        primarySpecialist: data.primarySpecialist as SpecialistId,
        alsoSpecialist: (data.alsoSpecialist === 'null'
          ? null
          : data.alsoSpecialist) as SpecialistId | null,
        subTasks: data.subTasks || [],
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      };
    } catch (e) {
      this.logger.error('Failed to parse reasoning JSON output:', e);
      return {
        thoughts: [{ step: 1, thought: 'Error parsing LLM output' }],
        primarySpecialist: 'rex',
        alsoSpecialist: null,
        subTasks: [],
        confidence: 0,
      };
    }
  }

  private enforceSafePair(
    primary: SpecialistId,
    also: SpecialistId | null,
  ): { primarySpecialist: SpecialistId; alsoSpecialist: SpecialistId | null } {
    const allowedPair = SAFE_PAIRS[primary];

    if (also && allowedPair !== also) {
      this.logger.warn(
        `Reasoning proposed unsafe pair: ${primary} + ${also}. Overriding to safe pair: ${primary} + ${allowedPair}`,
      );
      return { primarySpecialist: primary, alsoSpecialist: allowedPair };
    }

    return { primarySpecialist: primary, alsoSpecialist: also };
  }
}
