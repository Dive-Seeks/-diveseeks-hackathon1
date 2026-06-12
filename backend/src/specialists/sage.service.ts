import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  SeoOutputSchema,
  SeoOutput,
  SeoTemplateFallback,
} from './schemas/seo.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class SageService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<SeoOutput> {
    return this.factory.run<SeoOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: SeoOutputSchema,
      templateFallback: SeoTemplateFallback,
      lastCompact,
    });
  }
}
