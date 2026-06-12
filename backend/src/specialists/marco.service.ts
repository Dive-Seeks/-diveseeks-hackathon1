import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  MarketingOutputSchema,
  MarketingOutput,
  MarketingTemplateFallback,
} from './schemas/marketing.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class MarcoService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<MarketingOutput> {
    return this.factory.run<MarketingOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: MarketingOutputSchema,
      templateFallback: MarketingTemplateFallback,
      lastCompact,
    });
  }
}
