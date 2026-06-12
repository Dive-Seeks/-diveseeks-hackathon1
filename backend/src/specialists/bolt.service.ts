import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  InventoryOpsOutputSchema,
  InventoryOpsOutput,
  InventoryOpsTemplateFallback,
} from './schemas/inventory-ops.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class BoltService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<InventoryOpsOutput> {
    return this.factory.run<InventoryOpsOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: InventoryOpsOutputSchema,
      templateFallback: InventoryOpsTemplateFallback,
      lastCompact,
    });
  }
}
