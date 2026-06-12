import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSession } from './entities/agent-session.entity';

export interface BudgetCheck {
  allowed: boolean;
  spentUsd: number;
  limitUsd: number;
  pct: number;
}

const DEFAULT_LIMIT_USD = 10;

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    @InjectRepository(AgentSession)
    private readonly sessionRepo: Repository<AgentSession>,
  ) {}

  async checkAndReserve(
    tenantId: string,
    estimatedCostUsd: number,
  ): Promise<BudgetCheck> {
    const spent = await this.getMonthSpend(tenantId);
    const limit = DEFAULT_LIMIT_USD;
    const pct = Math.round((spent / limit) * 100);
    const allowed = spent + estimatedCostUsd <= limit;

    if (!allowed) {
      this.logger.warn(
        `Tenant ${tenantId} budget exhausted: ${spent.toFixed(4)}/${limit} USD`,
      );
    } else if (pct >= 80) {
      this.logger.warn(`Tenant ${tenantId} at ${pct}% budget`);
    }

    return { allowed, spentUsd: spent, limitUsd: limit, pct };
  }

  async recordUsage(
    sessionId: string,
    tenantId: string,
    costUsd: number,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    await this.sessionRepo.increment(
      { id: sessionId, tenantId },
      'totalCostUsd',
      costUsd,
    );
    await this.sessionRepo.increment(
      { id: sessionId, tenantId },
      'totalInputTokens',
      inputTokens,
    );
    await this.sessionRepo.increment(
      { id: sessionId, tenantId },
      'totalOutputTokens',
      outputTokens,
    );
  }

  async getMonthSpend(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.sessionRepo
      .createQueryBuilder('s')
      .select('COALESCE(SUM(CAST(s.totalCostUsd AS FLOAT)), 0)', 'total')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.createdAt >= :start', { start: startOfMonth })
      .getRawOne<{ total: string }>();

    return parseFloat(result?.total ?? '0');
  }

  async getUsage(
    tenantId: string,
  ): Promise<{ spentUsd: number; limitUsd: number; pct: number }> {
    const spentUsd = await this.getMonthSpend(tenantId);
    const limitUsd = DEFAULT_LIMIT_USD;
    return { spentUsd, limitUsd, pct: Math.round((spentUsd / limitUsd) * 100) };
  }
}
