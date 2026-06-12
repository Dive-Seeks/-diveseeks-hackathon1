import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingProfile } from './entities/billing.entity';
import { BillingInvoice } from './entities/billing-invoice.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingProfile)
    private readonly billingProfileRepository: Repository<BillingProfile>,
    @InjectRepository(BillingInvoice)
    private readonly billingInvoiceRepository: Repository<BillingInvoice>,
  ) {}

  async getOverview(userId: string, tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('Billing requires tenant context');
    }

    const profile = await this.getOrCreateBillingProfile(tenantId, userId);

    return {
      success: true,
      data: profile,
    };
  }

  async getInvoices(
    tenantId: string | undefined,
    page: number,
    limit: number,
    status?: 'paid' | 'pending' | 'failed',
  ) {
    if (!tenantId) {
      throw new BadRequestException('Billing requires tenant context');
    }

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const where = status ? { tenantId, status } : { tenantId };

    const [invoices, total] = await this.billingInvoiceRepository.findAndCount({
      where,
      order: { issuedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      success: true,
      data: invoices,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  }

  private async getOrCreateBillingProfile(tenantId: string, userId: string) {
    let profile = await this.billingProfileRepository.findOne({
      where: { tenantId },
    });

    if (!profile) {
      profile = this.billingProfileRepository.create({
        tenantId,
        planName: 'Starter',
        billingEmail: `tenant-${tenantId.slice(0, 8)}@divepos.local`,
        currency: 'USD',
        billingCycle: 'monthly',
        outstandingAmount: '0.00',
        status: 'active',
        provider: null,
        providerCustomerId: null,
      });
      profile = await this.billingProfileRepository.save(profile);
    }

    if (!profile) {
      throw new NotFoundException(
        `Billing profile not found for user ${userId}`,
      );
    }

    return profile;
  }
}
