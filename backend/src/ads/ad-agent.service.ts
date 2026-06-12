import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdBudgetService, AdBudgetStatus } from './ad-budget.service';
import { AdKillRuleService } from './ad-kill-rule.service';
import { AdScaleService, ScaleRecommendation } from './ad-scale.service';
import {
  AdStrategyOutputSchema,
  AdStrategyOutput,
  AdStrategyTemplateFallback,
} from './schemas/ad-strategy.schema';

import { AI_TASKS } from '../common/ai-models.constants';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class AdAgentService {
  private readonly logger = new Logger(AdAgentService.name);

  constructor(
    @InjectRepository(AdCampaign)
    private readonly campaignRepo: Repository<AdCampaign>,
    private readonly budgetService: AdBudgetService,
    private readonly killRule: AdKillRuleService,
    private readonly scaleService: AdScaleService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async runForTenant(
    tenantId: string,
    businessType: string,
  ): Promise<{
    strategy: AdStrategyOutput;
    killedCount: number;
    scaleRecommendations: ScaleRecommendation[];
    budgetStatus: AdBudgetStatus;
  }> {
    this.logger.log(
      `Ad Agent running for tenant=${tenantId} businessType=${businessType}`,
    );

    const budgetStatus = await this.budgetService.getStatus(tenantId);

    if (!budgetStatus.isSet || budgetStatus.monthlyBudgetCents === 0) {
      this.logger.log(`Tenant ${tenantId} has no ad budget set — skipping`);
      return {
        strategy: AdStrategyTemplateFallback,
        killedCount: 0,
        scaleRecommendations: [],
        budgetStatus,
      };
    }

    // Step 1: kill bad ads (deterministic, no LLM)
    const { killed } = await this.killRule.runForTenant(tenantId);

    // Step 2: identify winners (deterministic, no LLM)
    const scaleRecommendations =
      await this.scaleService.findAndFlagWinners(tenantId);

    // Step 3: load current campaigns for context
    const campaigns = await this.campaignRepo.find({ where: { tenantId } });

    // Step 4: build prompt context
    const activeCampaigns = campaigns.filter(
      (c) => c.status === 'active' || c.status === 'scaling',
    );
    const pendingScale = campaigns.filter(
      (c) => c.status === 'pending_scale_approval',
    );

    const prompt = `You are the Smart Ad Manager Agent for a ${businessType} business.

## Ad Budget
Monthly budget: ${(budgetStatus.monthlyBudgetCents / 100).toFixed(2)} 
Spent this month: ${(budgetStatus.spentThisMonthCents / 100).toFixed(2)}
Remaining: ${(budgetStatus.remainingCents / 100).toFixed(2)}
Suggested investment increase: ${(budgetStatus.suggestedIncreaseCents / 100).toFixed(2)}

## Active Campaigns (${activeCampaigns.length})
${activeCampaigns.map((c) => `- ${c.campaignName} (${c.platform}): spent=${c.spentCents}¢, conversions=${c.conversions}, CPR=${c.costPerResultCents ?? 'N/A'}¢`).join('\n') || 'None'}

## Campaigns Killed This Run (${killed.length})
${killed.map((c) => `- ${c.campaignName}: ${c.killReason}`).join('\n') || 'None'}

## Campaigns Pending Scale Approval (${pendingScale.length})
${pendingScale.map((c) => `- ${c.campaignName}: ${c.scaleRecommendation}`).join('\n') || 'None'}

Based on the above, generate an ad strategy report for tonight's nightly summary.
Recommend how to allocate the remaining budget across platforms (Meta, Google, TikTok).
Suggest 1–3 new or continued campaigns with creative direction.
Always suggest a small budget increase if overall performance is positive — frame it as an investment opportunity.
Every recommendation goes to the tenant for approval — never auto-spend.`;

    try {
      const { object: strategy } = await generateObject({
        model: this.aiRouter.getModel(AI_TASKS.SPECIALIST),
        schema: AdStrategyOutputSchema,
        prompt,
      });

      return {
        strategy,
        killedCount: killed.length,
        scaleRecommendations,
        budgetStatus,
      };
    } catch (err: any) {
      this.logger.error(
        `AdAgent generateObject failed: ${err.message} — using fallback`,
      );
      return {
        strategy: AdStrategyTemplateFallback,
        killedCount: killed.length,
        scaleRecommendations,
        budgetStatus,
      };
    }
  }
}
