import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebsiteBuilderService } from './website-builder.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { GenerateSiteDto } from './dto/generate-site.dto';

@ApiTags('Website Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('website-builder')
export class WebsiteBuilderController {
  constructor(private readonly svc: WebsiteBuilderService) {}

  @Get('sites/:siteId/config')
  @ApiOperation({ summary: 'Get website config for a site' })
  getSiteConfig(@Param('siteId') siteId: string, @Req() req: any) {
    return this.svc.getSiteConfig(siteId, req.user.businessId);
  }

  @Patch('sites/:siteId/config')
  @ApiOperation({
    summary:
      'Update website config — accepts partial puckData, theme, seo, subdomain',
  })
  updateSiteConfig(
    @Param('siteId') siteId: string,
    @Body() dto: UpdateSiteConfigDto,
    @Req() req: any,
  ) {
    return this.svc.updateSiteConfig(siteId, req.user.businessId, dto);
  }

  @Post('sites/:siteId/generate')
  @ApiOperation({
    summary: 'AI generate site — requires templateFamily in body',
  })
  generateSite(
    @Param('siteId') siteId: string,
    @Body() dto: GenerateSiteDto,
    @Req() req: any,
  ) {
    return this.svc.generateSite(
      siteId,
      req.user.businessId,
      dto.templateFamily,
      dto.merchantHint,
    );
  }

  @Post('sites/:siteId/publish')
  @ApiOperation({ summary: 'Publish site' })
  publishSite(@Param('siteId') siteId: string, @Req() req: any) {
    return this.svc.publishSite(siteId, req.user.businessId);
  }
}

@Controller('public/sites')
export class PublicSiteController {
  constructor(private readonly svc: WebsiteBuilderService) {}

  @Get(':subdomain')
  @ApiOperation({
    summary: 'Public — get published site by subdomain (no auth)',
  })
  getPublicSite(@Param('subdomain') subdomain: string) {
    return this.svc.getPublicSiteBySubdomain(subdomain);
  }
}
