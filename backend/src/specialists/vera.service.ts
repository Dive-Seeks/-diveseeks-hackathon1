import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  CustomerSupportOutputSchema,
  CustomerSupportOutput,
  CustomerSupportTemplateFallback,
} from './schemas/customer-support.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class VeraService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<CustomerSupportOutput> {
    return this.factory.run<CustomerSupportOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: CustomerSupportOutputSchema,
      templateFallback: CustomerSupportTemplateFallback,
      lastCompact,
    });
  }
}
