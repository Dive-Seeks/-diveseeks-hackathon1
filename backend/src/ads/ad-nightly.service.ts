import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdBudget } from './entities/ad-budget.entity';
import { AdAgentService } from './ad-agent.service';
import { AdStrategyOutput } from './schemas/ad-strategy.schema';

export interface NightlyAdReport {
  tenantId: string;
  strategy: AdStrategyOutput;
  killedCount: number;
  scaleRecommendationCount: number;
  budgetUtilizationPct: number;
  suggestedIncreaseCents: number;
}

@Injectable()
export class AdNightlyService {
  private readonly logger = new Logger(AdNightlyService.name);

  constructor(
    @InjectRepository(AdBudget)
    private readonly budgetRepo: Repository<AdBudget>,
    private readonly adAgent: AdAgentService,
  ) {}

  /** Run Ad Agent for all tenants with an active budget. Called from JosService nightly loop. */
  async runNightly(
    businessTypeMap: Record<string, string>,
  ): Promise<NightlyAdReport[]> {
    const activeBudgets = await this.budgetRepo.find({
      where: { isSet: true },
    });
    const reports: NightlyAdReport[] = [];

    for (const budget of activeBudgets) {
      if (budget.monthlyBudgetCents === 0) continue;
      const businessType = businessTypeMap[budget.tenantId] ?? 'RESTAURANT';
      try {
        const result = await this.adAgent.runForTenant(
          budget.tenantId,
          businessType,
        );
        reports.push({
          tenantId: budget.tenantId,
          strategy: result.strategy,
          killedCount: result.killedCount,
          scaleRecommendationCount: result.scaleRecommendations.length,
          budgetUtilizationPct: result.budgetStatus.utilizationPct,
          suggestedIncreaseCents: result.budgetStatus.suggestedIncreaseCents,
        });
      } catch (err: any) {
        this.logger.error(
          `Nightly ad run failed for tenant ${budget.tenantId}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Nightly ad run complete: ${reports.length} tenant(s) processed`,
    );
    return reports;
  }
}
