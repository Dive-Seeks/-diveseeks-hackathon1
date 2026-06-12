import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingService } from './services/listing.service';
import { ModerateListingDto } from './dto/marketplace.dto';
import { ModerationStatus } from './entities/marketplace-listing.entity';

@Controller('marketplace-admin')
@UseGuards(JwtAuthGuard)
export class MarketplaceAdminController {
  constructor(private readonly listingService: ListingService) {}

  @Post(':id/moderate')
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateListingDto,
  ) {
    return this.listingService.moderate(id, dto.moderation);
  }

  @Post(':id/verify')
  verify(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingService.moderate(id, ModerationStatus.APPROVED);
  }
}
