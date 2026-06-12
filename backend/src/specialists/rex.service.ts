import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  InventoryOutputSchema,
  InventoryOutput,
  InventoryTemplateFallback,
} from './schemas/inventory.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class RexService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<InventoryOutput> {
    return this.factory.run<InventoryOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: InventoryOutputSchema,
      templateFallback: InventoryTemplateFallback,
      lastCompact,
    });
  }
}
