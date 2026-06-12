import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdCampaign, KillReason } from './entities/ad-campaign.entity';

export interface KillDecision {
  shouldKill: boolean;
  reason: KillReason;
  detail: string;
}

const TIME_GATE_HOURS = 72;
const SPEND_FLOOR_PCT = 0.2; // 20% of allocated budget must be spent

@Injectable()
export class AdKillRuleService {
  private readonly logger = new Logger(AdKillRuleService.name);

  constructor(
    @InjectRepository(AdCampaign)
    private readonly repo: Repository<AdCampaign>,
  ) {}

  /**
   * Apply 3-layer kill rule to a single campaign.
   * Returns kill decision WITHOUT saving — caller decides whether to persist.
   */
  evaluate(campaign: AdCampaign): KillDecision {
    // Layer 1: time gate
    if (campaign.hoursRunning < TIME_GATE_HOURS) {
      return {
        shouldKill: false,
        reason: null,
        detail: `Time gate not met: ${campaign.hoursRunning}h < ${TIME_GATE_HOURS}h`,
      };
    }

    // Layer 2: spend floor
    const spendFloor = Math.floor(
      campaign.allocatedBudgetCents * SPEND_FLOOR_PCT,
    );
    if (campaign.spentCents < spendFloor) {
      return {
        shouldKill: false,
        reason: null,
        detail: `Spend floor not met: ${campaign.spentCents}¢ < ${spendFloor}¢ (20% of ${campaign.allocatedBudgetCents}¢)`,
      };
    }

    // Layer 3: cost-per-result benchmark
    if (campaign.conversions === 0) {
      // Spent through floor with zero conversions = kill
      return {
        shouldKill: true,
        reason: 'spend_floor_hit',
        detail: `Spent ${campaign.spentCents}¢ of ${campaign.allocatedBudgetCents}¢ with 0 conversions after ${campaign.hoursRunning}h`,
      };
    }

    const cpr = Math.round(campaign.spentCents / campaign.conversions);
    if (cpr > campaign.benchmarkCprCents) {
      return {
        shouldKill: true,
        reason: 'cost_per_result_exceeded',
        detail: `CPR ${cpr}¢ exceeds benchmark ${campaign.benchmarkCprCents}¢ after ${campaign.hoursRunning}h`,
      };
    }

    return {
      shouldKill: false,
      reason: null,
      detail: `Healthy: CPR ${cpr}¢ ≤ benchmark ${campaign.benchmarkCprCents}¢`,
    };
  }

  /** Apply kill rule to all active campaigns for a tenant and persist kills */
  async runForTenant(
    tenantId: string,
  ): Promise<{ killed: AdCampaign[]; healthy: AdCampaign[] }> {
    const active = await this.repo.find({
      where: { tenantId, status: 'active' },
    });

    const killed: AdCampaign[] = [];
    const healthy: AdCampaign[] = [];

    for (const campaign of active) {
      const decision = this.evaluate(campaign);
      if (decision.shouldKill) {
        campaign.status = 'killed';
        campaign.killReason = decision.reason;
        await this.repo.save(campaign);
        killed.push(campaign);
        this.logger.log(
          `Killed campaign ${campaign.id} (${campaign.campaignName}): ${decision.detail}`,
        );
      } else {
        healthy.push(campaign);
      }
    }

    return { killed, healthy };
  }
}
