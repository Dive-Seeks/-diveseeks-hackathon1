import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  ContentOutputSchema,
  ContentOutput,
  ContentTemplateFallback,
} from './schemas/content.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class ClioService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<ContentOutput> {
    return this.factory.run<ContentOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: ContentOutputSchema,
      templateFallback: ContentTemplateFallback,
      lastCompact,
    });
  }
}
