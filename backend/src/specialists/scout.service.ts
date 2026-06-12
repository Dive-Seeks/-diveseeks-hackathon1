import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  FulfilmentOutputSchema,
  FulfilmentOutput,
  FulfilmentTemplateFallback,
} from './schemas/fulfilment.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class ScoutService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<FulfilmentOutput> {
    return this.factory.run<FulfilmentOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: FulfilmentOutputSchema,
      templateFallback: FulfilmentTemplateFallback,
      lastCompact,
    });
  }
}
