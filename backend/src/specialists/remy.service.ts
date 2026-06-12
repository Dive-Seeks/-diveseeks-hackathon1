import { Injectable } from '@nestjs/common';
import { AdAgentService } from '../ads/ad-agent.service';
import {
  AdStrategyOutputSchema,
  AdStrategyOutput,
  AdStrategyTemplateFallback,
} from '../ads/schemas/ad-strategy.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class RemyService {
  constructor(private readonly adAgent: AdAgentService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<AdStrategyOutput> {
    const result = await this.adAgent.runForTenant(tenantId, 'ECOMMERCE');
    return result.strategy;
  }
}
