import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  PromotionsOutputSchema,
  PromotionsOutput,
  PromotionsTemplateFallback,
} from './schemas/promotions.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class DashService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<PromotionsOutput> {
    return this.factory.run<PromotionsOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: PromotionsOutputSchema,
      templateFallback: PromotionsTemplateFallback,
      lastCompact,
    });
  }
}
