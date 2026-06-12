import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  SeoCroOutputSchema,
  SeoCroOutput,
  SeoCroTemplateFallback,
} from './schemas/seo-cro.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class KiraService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<SeoCroOutput> {
    return this.factory.run<SeoCroOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: SeoCroOutputSchema,
      templateFallback: SeoCroTemplateFallback,
      lastCompact,
    });
  }
}
