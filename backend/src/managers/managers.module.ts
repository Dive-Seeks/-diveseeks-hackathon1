import { Module, forwardRef } from '@nestjs/common';
import { BaseManagerService } from './base-manager.service';
import { MenuManagerService } from './menu-manager.service';
import { MarketingManagerService } from './marketing-manager.service';
import { DesignManagerService } from './design-manager.service';
import { AnalyticsManagerService } from './analytics-manager.service';
import { InventoryManagerService } from './inventory-manager.service';
import { SeoManagerService } from './seo-manager.service';
import { LoyaltyManagerService } from './loyalty-manager.service';
import { ManagersController } from './managers.controller';
import { SoulModule } from '../common/soul/soul.module';
import { AbigailModule } from '../abigail/abigail.module';
import { WorkforceModule } from '../workforce/workforce.module';
// Retail managers
import { CooManagerService } from './coo-manager.service';
import { CustomerServiceManagerService } from './customer-service-manager.service';
import { InventorySupplyChainManagerService } from './inventory-supply-chain-manager.service';
import { MerchandisingManagerService } from './merchandising-manager.service';
import { CmoManagerService } from './cmo-manager.service';
// Ecommerce managers
import { HeadOfCommerceManagerService } from './head-of-commerce-manager.service';
import { GrowthManagerService } from './growth-manager.service';
import { PerformanceManagerService } from './performance-manager.service';
import { AccountingManagerService } from './accounting-manager.service';

@Module({
  imports: [SoulModule, WorkforceModule, forwardRef(() => AbigailModule)],
  controllers: [ManagersController],
  providers: [
    BaseManagerService,
    MenuManagerService,
    MarketingManagerService,
    DesignManagerService,
    AnalyticsManagerService,
    InventoryManagerService,
    SeoManagerService,
    LoyaltyManagerService,
    CooManagerService,
    CustomerServiceManagerService,
    InventorySupplyChainManagerService,
    MerchandisingManagerService,
    CmoManagerService,
    HeadOfCommerceManagerService,
    GrowthManagerService,
    PerformanceManagerService,
    AccountingManagerService,
  ],
  exports: [
    MenuManagerService,
    MarketingManagerService,
    DesignManagerService,
    AnalyticsManagerService,
    InventoryManagerService,
    SeoManagerService,
    LoyaltyManagerService,
    CooManagerService,
    CustomerServiceManagerService,
    InventorySupplyChainManagerService,
    MerchandisingManagerService,
    CmoManagerService,
    HeadOfCommerceManagerService,
    GrowthManagerService,
    PerformanceManagerService,
    AccountingManagerService,
  ],
})
export class ManagersModule {}
