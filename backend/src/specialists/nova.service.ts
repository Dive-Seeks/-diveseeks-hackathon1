import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  ImagesOutputSchema,
  ImagesOutput,
  ImagesTemplateFallback,
} from './schemas/images.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class NovaService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<ImagesOutput> {
    return this.factory.run<ImagesOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: ImagesOutputSchema,
      templateFallback: ImagesTemplateFallback,
      lastCompact,
    });
  }
}
