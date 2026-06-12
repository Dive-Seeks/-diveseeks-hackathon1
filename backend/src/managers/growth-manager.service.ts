import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class GrowthManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewSeoCro(output: unknown, title: string, constraints?: unknown) {
    return this.review('growth', output, title, constraints);
  }

  async reviewEmailSms(output: unknown, title: string, constraints?: unknown) {
    return this.review('growth', output, title, constraints);
  }

  async reviewReviewsLoyalty(
    output: unknown,
    title: string,
    constraints?: unknown,
  ) {
    return this.review('growth', output, title, constraints);
  }
}
