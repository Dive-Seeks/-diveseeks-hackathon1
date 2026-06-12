import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  OrionOutputSchema,
  OrionOutput,
  OrionTemplateFallback,
} from './schemas/orion.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class OrionService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<OrionOutput> {
    return this.factory.run<OrionOutput>({
      issueId,
      agentId: `${agentId}-orion`,
      tenantId,
      tenantContext,
      outputSchema: OrionOutputSchema,
      templateFallback: OrionTemplateFallback,
      lastCompact,
    });
  }
}
