import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdBudget } from './entities/ad-budget.entity';

export interface AdBudgetStatus {
  isSet: boolean;
  monthlyBudgetCents: number;
  spentThisMonthCents: number;
  remainingCents: number;
  suggestedIncreaseCents: number;
  utilizationPct: number;
}

@Injectable()
export class AdBudgetService {
  private readonly logger = new Logger(AdBudgetService.name);

  constructor(
    @InjectRepository(AdBudget)
    private readonly repo: Repository<AdBudget>,
  ) {}

  async getOrCreate(tenantId: string): Promise<AdBudget> {
    let record = await this.repo.findOne({ where: { tenantId } });
    if (!record) {
      record = this.repo.create({
        tenantId,
        monthlyBudgetCents: 0,
        spentThisMonthCents: 0,
        isSet: false,
      });
      await this.repo.save(record);
    }
    return record;
  }

  async setBudget(
    tenantId: string,
    monthlyBudgetCents: number,
  ): Promise<AdBudget> {
    const record = await this.getOrCreate(tenantId);
    record.monthlyBudgetCents = monthlyBudgetCents;
    record.isSet = true;
    // Suggest 20% more as upsell hint
    record.suggestedIncreaseCents = Math.round(monthlyBudgetCents * 0.2);
    await this.repo.save(record);
    this.logger.log(
      `Ad budget set for tenant ${tenantId}: ${monthlyBudgetCents} cents/month`,
    );
    return record;
  }

  async getStatus(tenantId: string): Promise<AdBudgetStatus> {
    const record = await this.getOrCreate(tenantId);
    this.resetIfNewMonth(record);
    const remaining = Math.max(
      0,
      record.monthlyBudgetCents - record.spentThisMonthCents,
    );
    const utilizationPct =
      record.monthlyBudgetCents > 0
        ? Math.round(
            (record.spentThisMonthCents / record.monthlyBudgetCents) * 100,
          )
        : 0;
    return {
      isSet: record.isSet,
      monthlyBudgetCents: record.monthlyBudgetCents,
      spentThisMonthCents: record.spentThisMonthCents,
      remainingCents: remaining,
      suggestedIncreaseCents: record.suggestedIncreaseCents,
      utilizationPct,
    };
  }

  async recordSpend(tenantId: string, spentCents: number): Promise<void> {
    const record = await this.getOrCreate(tenantId);
    this.resetIfNewMonth(record);
    record.spentThisMonthCents += spentCents;
    await this.repo.save(record);
  }

  private resetIfNewMonth(record: AdBudget): void {
    const today = new Date().toISOString().slice(0, 7); // YYYY-MM
    if (record.lastResetDate !== today) {
      record.spentThisMonthCents = 0;
      record.lastResetDate = today;
    }
  }
}
