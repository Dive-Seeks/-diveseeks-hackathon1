import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  AnalyticsReportOutputSchema,
  AnalyticsReportOutput,
  AnalyticsReportTemplateFallback,
} from './schemas/analytics-report.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class FinnService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<AnalyticsReportOutput> {
    return this.factory.run<AnalyticsReportOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: AnalyticsReportOutputSchema,
      templateFallback: AnalyticsReportTemplateFallback,
      lastCompact,
    });
  }
}
