import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  AnalyticsCxOutputSchema,
  AnalyticsCxOutput,
  AnalyticsCxTemplateFallback,
} from './schemas/analytics-cx.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class FluxService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<AnalyticsCxOutput> {
    return this.factory.run<AnalyticsCxOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: AnalyticsCxOutputSchema,
      templateFallback: AnalyticsCxTemplateFallback,
      lastCompact,
    });
  }
}
