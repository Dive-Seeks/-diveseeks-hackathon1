import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class HeadOfCommerceManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewCatalogue(output: unknown, title: string, constraints?: unknown) {
    return this.review('head_of_commerce', output, title, constraints);
  }

  async reviewFulfilment(
    output: unknown,
    title: string,
    constraints?: unknown,
  ) {
    return this.review('head_of_commerce', output, title, constraints);
  }
}
