import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdCampaign } from './entities/ad-campaign.entity';

const WINNER_CPR_RATIO = 0.5; // CPR must be ≤ 50% of benchmark
const WINNER_MIN_CONVERSIONS = 3;
const WINNER_MIN_HOURS = 48;
const SCALE_BUDGET_MULTIPLIER = 0.2; // suggest 20% more budget

export interface ScaleRecommendation {
  campaignId: string;
  campaignName: string;
  currentCprCents: number;
  benchmarkCprCents: number;
  conversions: number;
  suggestedAdditionalCents: number;
  message: string;
}

@Injectable()
export class AdScaleService {
  private readonly logger = new Logger(AdScaleService.name);

  constructor(
    @InjectRepository(AdCampaign)
    private readonly repo: Repository<AdCampaign>,
  ) {}

  /** Identify winners in tenant's active campaigns and flag for approval */
  async findAndFlagWinners(tenantId: string): Promise<ScaleRecommendation[]> {
    const active = await this.repo.find({
      where: { tenantId, status: 'active' },
    });
    const recommendations: ScaleRecommendation[] = [];

    for (const campaign of active) {
      if (!this.isWinner(campaign)) continue;

      const cpr = Math.round(campaign.spentCents / campaign.conversions);
      const suggested = Math.round(
        campaign.allocatedBudgetCents * SCALE_BUDGET_MULTIPLIER,
      );
      const message =
        `"${campaign.campaignName}" is performing ${Math.round((1 - cpr / campaign.benchmarkCprCents) * 100)}% ` +
        `below your cost target with ${campaign.conversions} conversions. ` +
        `Investing an extra ${(suggested / 100).toFixed(2)} could accelerate results. Approve to scale?`;

      campaign.status = 'pending_scale_approval';
      campaign.scaleRecommendation = message;
      campaign.scaleSuggestedCents = suggested;
      campaign.costPerResultCents = cpr;
      await this.repo.save(campaign);

      recommendations.push({
        campaignId: campaign.id,
        campaignName: campaign.campaignName,
        currentCprCents: cpr,
        benchmarkCprCents: campaign.benchmarkCprCents,
        conversions: campaign.conversions,
        suggestedAdditionalCents: suggested,
        message,
      });

      this.logger.log(
        `Winner flagged for approval: ${campaign.campaignName} (${tenantId})`,
      );
    }

    return recommendations;
  }

  /** Tenant approved scale — increase allocated budget */
  async approveScale(
    campaignId: string,
    tenantId: string,
  ): Promise<AdCampaign> {
    const campaign = await this.repo.findOne({
      where: { id: campaignId, tenantId },
    });
    if (!campaign)
      throw new Error(
        `Campaign ${campaignId} not found for tenant ${tenantId}`,
      );
    if (campaign.status !== 'pending_scale_approval') {
      throw new Error(`Campaign ${campaignId} is not pending scale approval`);
    }
    campaign.allocatedBudgetCents += campaign.scaleSuggestedCents ?? 0;
    campaign.status = 'scaling';
    campaign.scaleRecommendation = null;
    campaign.scaleSuggestedCents = null;
    await this.repo.save(campaign);
    this.logger.log(
      `Scale approved: ${campaign.campaignName} new budget ${campaign.allocatedBudgetCents}¢`,
    );
    return campaign;
  }

  private isWinner(campaign: AdCampaign): boolean {
    if (campaign.conversions < WINNER_MIN_CONVERSIONS) return false;
    if (campaign.hoursRunning < WINNER_MIN_HOURS) return false;
    const cpr = campaign.spentCents / campaign.conversions;
    return cpr <= campaign.benchmarkCprCents * WINNER_CPR_RATIO;
  }
}
