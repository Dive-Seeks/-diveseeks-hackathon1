import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  AnalyticsOutputSchema,
  AnalyticsOutput,
  AnalyticsTemplateFallback,
} from './schemas/analytics.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class KaiService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<AnalyticsOutput> {
    return this.factory.run<AnalyticsOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: AnalyticsOutputSchema,
      templateFallback: AnalyticsTemplateFallback,
      lastCompact,
    });
  }
}
