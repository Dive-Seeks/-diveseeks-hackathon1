import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  ReviewsLoyaltyOutputSchema,
  ReviewsLoyaltyOutput,
  ReviewsLoyaltyTemplateFallback,
} from './schemas/reviews-loyalty.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class IvyService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<ReviewsLoyaltyOutput> {
    return this.factory.run<ReviewsLoyaltyOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: ReviewsLoyaltyOutputSchema,
      templateFallback: ReviewsLoyaltyTemplateFallback,
      lastCompact,
    });
  }
}
