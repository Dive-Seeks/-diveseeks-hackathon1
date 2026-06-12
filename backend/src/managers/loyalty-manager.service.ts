import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class LoyaltyManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewLoyalty(output: unknown, title: string, constraints?: unknown) {
    return this.review('loyalty', output, title, constraints);
  }
}
