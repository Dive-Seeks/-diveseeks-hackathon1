import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SiteType } from '../sites/entities/site.entity';

@ApiTags('Pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('resolve/:productId')
  @ApiOperation({ summary: 'Resolve the price for a product based on context' })
  async resolvePrice(
    @Param('productId') productId: string,
    @Query('siteId') siteId?: string,
    @Query('storeId') storeId?: string,
    @Query('channel') channel?: SiteType,
  ) {
    const amount = await this.pricingService.resolvePrice(
      productId,
      siteId,
      storeId,
      channel,
    );
    return { success: true, data: { amount } };
  }
}
