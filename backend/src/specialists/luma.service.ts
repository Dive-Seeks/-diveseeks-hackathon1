import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  LoyaltyOutputSchema,
  LoyaltyOutput,
  LoyaltyTemplateFallback,
} from './schemas/loyalty.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class LumaService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<LoyaltyOutput> {
    return this.factory.run<LoyaltyOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: LoyaltyOutputSchema,
      templateFallback: LoyaltyTemplateFallback,
      lastCompact,
    });
  }
}
