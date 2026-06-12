import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  StockOutputSchema,
  StockOutput,
  StockTemplateFallback,
} from './schemas/stock.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class DepotService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<StockOutput> {
    return this.factory.run<StockOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: StockOutputSchema,
      templateFallback: StockTemplateFallback,
      lastCompact,
    });
  }
}
