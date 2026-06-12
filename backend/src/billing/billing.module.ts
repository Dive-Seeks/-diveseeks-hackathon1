import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingProfile } from './entities/billing.entity';
import { BillingInvoice } from './entities/billing-invoice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BillingProfile, BillingInvoice])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
