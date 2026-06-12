import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  WebsiteOutputSchema,
  WebsiteOutput,
  WebsiteTemplateFallback,
} from './schemas/website.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class AtlasService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<WebsiteOutput> {
    return this.factory.run<WebsiteOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: WebsiteOutputSchema,
      templateFallback: WebsiteTemplateFallback,
      lastCompact,
    });
  }
}
