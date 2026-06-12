import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  MenuOutputSchema,
  MenuOutput,
  MenuTemplateFallback,
} from './schemas/menu.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class ZaraService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<MenuOutput> {
    return this.factory.run<MenuOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: MenuOutputSchema,
      templateFallback: MenuTemplateFallback,
      lastCompact,
    });
  }
}
