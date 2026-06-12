import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdBudget } from './entities/ad-budget.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdBudgetService } from './ad-budget.service';
import { AdKillRuleService } from './ad-kill-rule.service';
import { AdScaleService } from './ad-scale.service';
import { AdAgentService } from './ad-agent.service';
import { AdNightlyService } from './ad-nightly.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdBudget, AdCampaign])],
  providers: [
    AdBudgetService,
    AdKillRuleService,
    AdScaleService,
    AdAgentService,
    AdNightlyService,
  ],
  exports: [
    AdBudgetService,
    AdKillRuleService,
    AdScaleService,
    AdAgentService,
    AdNightlyService,
  ],
})
export class AdsModule {}
