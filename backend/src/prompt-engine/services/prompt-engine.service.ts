import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PromptTemplate } from '../entities/prompt-template.entity';

import { PromptExecution } from '../entities/prompt-execution.entity';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { TokenizerService } from '../../tokenizer/tokenizer.service';
import { BudgetService } from '../../coordinator/budget.service';
import {
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';

@Injectable()
export class PromptEngineService {
  private readonly logger = new Logger(PromptEngineService.name);

  constructor(
    @InjectRepository(PromptTemplate)
    private readonly templateRepo: Repository<PromptTemplate>,
    @InjectRepository(PromptExecution)
    private readonly executionRepo: Repository<PromptExecution>,
    private readonly tokenizer: TokenizerService,
    @Inject(forwardRef(() => BudgetService))
    private readonly budgetService: BudgetService,
  ) {}

  async render(
    name: string,
    variables: Record<string, any>,
    tenantId?: string,
  ): Promise<string> {
    const template = await this.templateRepo.findOne({
      where: [
        { name, tenantId, isActive: true },
        { name, tenantId: IsNull(), isActive: true },
      ],

      order: { tenantId: 'DESC', version: 'DESC' },
    });

    if (!template) {
      throw new NotFoundException(`Prompt template "${name}" not found`);
    }

    let rendered = template.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.split(placeholder).join(String(value));
    }

    return rendered;
  }

  async execute(
    name: string,
    variables: Record<string, any>,
    options: {
      model?: string;
      provider?: 'google' | 'openai';
      tenantId?: string;
    } = {},
  ): Promise<string> {
    const { model = 'gemini-2.5-pro', provider = 'google', tenantId } = options;

    const rendered = await this.render(name, variables, tenantId);
    const template = await this.templateRepo.findOne({ where: { name } });

    // ── Token budget guard ────────────────────────────────────────────────────
    const MAX_PROMPT_TOKENS = 100_000;
    const tokenCount = this.tokenizer.countTokens(rendered);
    if (tokenCount > MAX_PROMPT_TOKENS) {
      throw new BadRequestException(
        `Prompt "${name}" exceeds token budget: ${tokenCount} > ${MAX_PROMPT_TOKENS}`,
      );
    }
    this.logger.debug(`Prompt "${name}" token count: ${tokenCount}`);
    // ─────────────────────────────────────────────────────────────────────────

    // ── Budget hard stop gate ────────────────────────────────────────────────
    if (tenantId) {
      const summary = await this.budgetService.getSpendSummary(tenantId);
      if (summary.paused) {
        throw new ServiceUnavailableException(
          'Budget limit reached — LLM calls paused for this tenant',
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const startTime = Date.now();
    let output = '';
    let usage = { promptTokens: 0, completionTokens: 0 };
    let llmSucceeded = false;

    try {
      const modelInstance = this.getModelInstance(provider, model);
      const result = await generateText({
        model: modelInstance,
        prompt: rendered,
      });

      output = result.text;
      usage = {
        promptTokens: (result.usage as any)?.promptTokens || 0,
        completionTokens: (result.usage as any)?.completionTokens || 0,
      };
      llmSucceeded = true;
    } catch (error) {
      this.logger.error(`Failed to execute prompt "${name}": ${error.message}`);
      throw error;
    } finally {
      const latencyMs = Date.now() - startTime;

      // Log execution asynchronously
      this.executionRepo
        .save({
          templateId: template?.id || 'unknown',
          inputs: variables,
          output,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          latencyMs,
          model,
          tenantId,
        })
        .catch((err) =>
          this.logger.error(`Failed to log execution: ${err.message}`),
        );

      // Only record spend when tokens were actually consumed
      if (tenantId && llmSucceeded) {
        this.budgetService
          .recordSpend(tenantId, {
            provider,
            model,
            inputTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
          })
          .catch((err) =>
            this.logger.error(`Failed to record budget spend: ${err.message}`),
          );
      }
    }

    return output;
  }

  private getModelInstance(provider: string, model: string) {
    switch (provider) {
      case 'openai':
        return openai(model);
      case 'google':
      default:
        return google(model);
    }
  }
}
