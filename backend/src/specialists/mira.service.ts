import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  MerchandisingOutputSchema,
  MerchandisingOutput,
  MerchandisingTemplateFallback,
} from './schemas/merchandising.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class MiraService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<MerchandisingOutput> {
    return this.factory.run<MerchandisingOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: MerchandisingOutputSchema,
      templateFallback: MerchandisingTemplateFallback,
      lastCompact,
    });
  }
}
