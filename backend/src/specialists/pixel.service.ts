import { Injectable } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import {
  DesignOutputSchema,
  DesignOutput,
  DesignTemplateFallback,
} from './schemas/design.schema';
import { TenantContext } from '../common/soul/soul-engine.service';

@Injectable()
export class PixelService {
  constructor(private readonly factory: SpecialistFactoryService) {}

  async run(
    issueId: string,
    agentId: string,
    tenantId: string,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<DesignOutput> {
    return this.factory.run<DesignOutput>({
      issueId,
      agentId,
      tenantId,
      tenantContext,
      outputSchema: DesignOutputSchema,
      templateFallback: DesignTemplateFallback,
      lastCompact,
    });
  }
}
