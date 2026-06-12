import { Injectable } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class CustomerServiceManagerService extends BaseManagerService {
  constructor(soulEngine: SoulEngine, providerRouter: AiProviderRouter) {
    super(soulEngine, providerRouter);
  }

  async reviewCustomerSupport(
    output: unknown,
    title: string,
    constraints?: unknown,
  ) {
    return this.review('customer_service', output, title, constraints);
  }
}
