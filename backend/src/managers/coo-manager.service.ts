import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class CooManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewOperations(
    output: unknown,
    title: string,
    constraints?: unknown,
  ) {
    return this.review('coo', output, title, constraints);
  }
}
