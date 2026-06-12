import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenSpendEvent } from './entities/token-spend-event.entity';
import { TenantBudget } from './entities/tenant-budget.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SpendEventInput {
  sessionId?: string;
  jobId?: string;
  mcpId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface SpendSummary {
  tenantId: string;
  monthlyLimitCents: number;
  spentCents: number;
  remainingCents: number;
  paused: boolean;
  windowStart: Date;
  windowEnd: Date;
}

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  // Rate card: cents per 1M tokens
  private readonly RATE_CARD: Record<
    string,
    Record<string, { input: number; output: number }>
  > = {
    anthropic: {
      'claude-sonnet-4-6': { input: 300, output: 1500 },
      'claude-haiku-4-5': { input: 25, output: 125 },
      'claude-3-5-sonnet-20240620': { input: 300, output: 1500 },
    },
    openai: {
      'gpt-4o': { input: 250, output: 1000 },
      'gpt-4o-mini': { input: 15, output: 60 },
    },
    google: {
      'gemini-2.0-flash': { input: 10, output: 40 },
      'gemini-2.5-flash': { input: 7.5, output: 30 },
      'gemini-2.5-pro': { input: 350, output: 1050 },
    },
    deepseek: {
      'deepseek-chat': { input: 27, output: 110 }, // V3 / V4-Flash pricing (per 1M tokens, cents)
      'deepseek-reasoner': { input: 55, output: 219 }, // V3-R1 / V4-Pro pricing
    },
  };

  constructor(
    @InjectRepository(TokenSpendEvent)
    private readonly spendRepo: Repository<TokenSpendEvent>,
    @InjectRepository(TenantBudget)
    private readonly budgetRepo: Repository<TenantBudget>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async recordSpend(tenantId: string, input: SpendEventInput): Promise<void> {
    const costCents = this.calculateCost(
      input.provider,
      input.model,
      input.inputTokens,
      input.outputTokens,
    );

    // 1. Write Spend Event
    const event = this.spendRepo.create({
      tenantId,
      ...input,
      totalTokens: input.inputTokens + input.outputTokens,
      costCents,
    });
    await this.spendRepo.save(event);

    // 2. Ensure row exists, then atomic increment
    await this.getOrCreateBudget(tenantId);

    await this.budgetRepo
      .createQueryBuilder()
      .update(TenantBudget)
      .set({
        // DB column is camelCase ("spentCents") — entity has no name override
        spentCents: () => `"spentCents" + ${costCents}`,
      })
      .where('tenantId = :tenantId', { tenantId })
      .execute();

    // 3. Check for threshold breach
    const updatedBudget = await this.budgetRepo.findOne({
      where: { tenantId },
    });
    if (
      updatedBudget &&
      updatedBudget.spentCents >= updatedBudget.monthlyLimitCents &&
      !updatedBudget.paused
    ) {
      await this.budgetRepo.update(updatedBudget.id, {
        paused: true,
        pausedAt: new Date(),
        pauseReason: 'monthly limit reached',
      });
      this.eventEmitter.emit('budget.paused', {
        tenantId,
        reason: 'monthly limit reached',
      });
      this.logger.warn(`Tenant ${tenantId} budget exceeded and paused.`);
    }
  }

  async getSpendSummary(tenantId: string): Promise<SpendSummary> {
    const budget = await this.getOrCreateBudget(tenantId);
    return {
      tenantId: budget.tenantId,
      monthlyLimitCents: budget.monthlyLimitCents,
      spentCents: budget.spentCents,
      remainingCents: Math.max(0, budget.monthlyLimitCents - budget.spentCents),
      paused: budget.paused,
      windowStart: budget.windowStart,
      windowEnd: budget.windowEnd,
    };
  }

  async checkBudget(tenantId: string): Promise<any | null> {
    const budget = await this.getOrCreateBudget(tenantId);

    if (budget.paused) {
      return {
        check: 'budget_status',
        severity: 'critical',
        message: `Budget paused: ${budget.pauseReason || 'manual pause'}`,
        details: {
          spentCents: budget.spentCents,
          limitCents: budget.monthlyLimitCents,
        },
      };
    }

    if (budget.spentCents >= budget.monthlyLimitCents) {
      // Should have been paused already, but just in case
      return {
        check: 'budget_status',
        severity: 'critical',
        message: 'Monthly budget limit reached',
        details: {
          spentCents: budget.spentCents,
          limitCents: budget.monthlyLimitCents,
        },
      };
    }

    if (budget.spentCents >= budget.monthlyLimitCents * 0.8) {
      return {
        check: 'budget_status',
        severity: 'warning',
        message: 'Monthly budget at 80%',
        details: {
          spentCents: budget.spentCents,
          limitCents: budget.monthlyLimitCents,
        },
      };
    }

    return null;
  }

  async resetMonthlyWindow(tenantId: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const windowEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    await this.budgetRepo.update(
      { tenantId },
      {
        spentCents: 0,
        paused: false,
        pausedAt: null,
        pauseReason: null,
        windowStart,
        windowEnd,
      },
    );
    this.logger.log(`Reset budget window for tenant ${tenantId}`);
  }

  async setLimit(tenantId: string, limitCents: number): Promise<void> {
    await this.getOrCreateBudget(tenantId);
    await this.budgetRepo.update(
      { tenantId },
      { monthlyLimitCents: limitCents },
    );
  }

  async unpause(tenantId: string): Promise<void> {
    await this.budgetRepo.update(
      { tenantId },
      { paused: false, pausedAt: null, pauseReason: null },
    );
  }

  async getRecentSpendEvents(
    tenantId: string,
    limit = 20,
  ): Promise<TokenSpendEvent[]> {
    return this.spendRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' as const },
      take: Math.min(limit, 100),
    });
  }

  private calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const rates = this.RATE_CARD[provider]?.[model] || {
      input: 1000,
      output: 2000,
    }; // Very high default if unknown
    const cost =
      (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
    return Math.max(1, Math.ceil(cost)); // Minimum 1 cent
  }

  private async getOrCreateBudget(tenantId: string): Promise<TenantBudget> {
    let budget = await this.budgetRepo.findOne({ where: { tenantId } });
    if (!budget) {
      const now = new Date();
      const windowStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const windowEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );

      budget = this.budgetRepo.create({
        tenantId,
        monthlyLimitCents: 500, // $5.00 default
        spentCents: 0,
        windowStart,
        windowEnd,
        paused: false,
      });
      await this.budgetRepo.save(budget);
    }
    return budget;
  }
}
