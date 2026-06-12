import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  ProductCatalogueOutputSchema,
  ProductCatalogueOutput,
  ProductCatalogueTemplateFallback,
} from './schemas/product-catalogue.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class LunaService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<ProductCatalogueOutput> {
    return this.factory.run<ProductCatalogueOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: ProductCatalogueOutputSchema,
      templateFallback: ProductCatalogueTemplateFallback,
      lastCompact,
    });
  }
}
