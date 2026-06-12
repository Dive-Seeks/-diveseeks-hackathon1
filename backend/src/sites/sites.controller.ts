import { Controller, Get, Param, Req, UseGuards, Query } from '@nestjs/common';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SiteListResponseDto } from './dto/site-response.dto';

@ApiTags('Sites (Channels)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales channels (sites) for a business' })
  @ApiResponse({ status: 200, type: SiteListResponseDto })
  async findAll(
    @Query('businessId') businessId: string,
  ): Promise<SiteListResponseDto> {
    if (!businessId) {
      return { data: [], total: 0 };
    }
    const sites = await this.sitesService.findAllByBusinessId(businessId);
    return {
      data: sites.map((site) => ({
        id: site.id,
        name: site.name,
        type: site.type,
        isActive: site.isActive,
        businessId: site.businessId,
        categoryCount: site.categoryCount,
        itemCount: site.itemCount,
        modifierCount: site.modifierCount,
        activeMenuId: site.activeMenuId,
        activeMenuName: site.activeMenuName,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      })),
      total: sites.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific site (channel) by ID' })
  async findOne(@Param('id') id: string) {
    return this.sitesService.findOne(id);
  }
}
