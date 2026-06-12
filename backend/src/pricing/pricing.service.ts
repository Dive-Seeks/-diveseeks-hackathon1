import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pricing } from './entities/pricing.entity';
import { SiteType } from '../sites/entities/site.entity';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Pricing)
    private readonly pricingRepository: Repository<Pricing>,
  ) {}

  async resolvePrice(
    productId: string,
    siteId?: string,
    storeId?: string,
    channel?: SiteType,
  ): Promise<number> {
    const prices = await this.pricingRepository.find({
      where: { productId },
    });

    if (!prices || prices.length === 0) {
      throw new NotFoundException(`No price found for product ${productId}`);
    }

    // Rule:
    // 1. store + site
    // 2. site only
    // 3. channel fallback
    // 4. default price

    let selectedPrice = prices.find((p) => p.isDefault);

    if (channel) {
      const channelPrice = prices.find(
        (p) => p.channel === channel && !p.siteId && !p.storeId,
      );
      if (channelPrice) selectedPrice = channelPrice;
    }

    if (siteId) {
      const sitePrice = prices.find((p) => p.siteId === siteId && !p.storeId);
      if (sitePrice) selectedPrice = sitePrice;
    }

    if (siteId && storeId) {
      const storeSitePrice = prices.find(
        (p) => p.siteId === siteId && p.storeId === storeId,
      );
      if (storeSitePrice) selectedPrice = storeSitePrice;
    }

    if (!selectedPrice) {
      throw new NotFoundException(
        `Unable to resolve price for product ${productId}`,
      );
    }

    return selectedPrice.amount;
  }
}
