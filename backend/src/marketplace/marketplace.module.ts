import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MarketplaceListing } from './entities/marketplace-listing.entity';
import { MarketplaceVersion } from './entities/marketplace-version.entity';
import { MarketplaceInstall } from './entities/marketplace-install.entity';
import { MarketplaceReview } from './entities/marketplace-review.entity';

import { ListingService } from './services/listing.service';
import { AgentCardService } from './services/agent-card.service';
import { A2ARunnerModule } from '../a2a-runner/a2a-runner.module';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceAdminController } from './marketplace-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketplaceListing,
      MarketplaceVersion,
      MarketplaceInstall,
      MarketplaceReview,
    ]),
    A2ARunnerModule,
  ],
  providers: [ListingService, AgentCardService],
  controllers: [MarketplaceController, MarketplaceAdminController],
  exports: [ListingService],
})
export class MarketplaceModule {}
