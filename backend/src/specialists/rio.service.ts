import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  PricingOutputSchema,
  PricingOutput,
  PricingTemplateFallback,
} from './schemas/pricing.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class RioService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<PricingOutput> {
    return this.factory.run<PricingOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: PricingOutputSchema,
      templateFallback: PricingTemplateFallback,
      lastCompact,
    });
  }
}
