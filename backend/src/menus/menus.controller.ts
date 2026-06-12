import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MenusService } from './menus.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  UpdateMenuAttributesDto,
  UpdateItemAttributesDto,
} from './dto/update-menu-attributes.dto';

@ApiTags('Menus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get('active/:siteId')
  @ApiOperation({
    summary: 'Get fully populated active menu for a given Site (channel)',
  })
  getActiveMenuForSite(@Param('siteId') siteId: string) {
    return this.menusService.getActiveMenuForSite(siteId);
  }

  @Post('categories')
  @ApiOperation({
    summary:
      'Get matching categories based on AI intent (cuisines, businessType)',
  })
  matchCategories(@Body() body: any) {
    return this.menusService.matchCategories(body);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Get items for selected category IDs',
  })
  getItemsByCategories(
    @Body() body: { categoryIds: string[]; businessType?: string },
  ) {
    return this.menusService.getItemsByCategories(
      body.categoryIds,
      body.businessType,
    );
  }

  @Post('bulk-create-wizard')
  @ApiOperation({
    summary:
      'Bulk create menu, categories, items, and modifers from the AI Wizard',
  })
  bulkCreateWizard(@Body() body: any) {
    return this.menusService.bulkCreateWizard(body);
  }

  @Patch(':id/global-attributes')
  @ApiOperation({
    summary: 'Set global attributes on a menu (dietary type, allergens etc.)',
  })
  setGlobalAttributes(
    @Param('id') id: string,
    @Body() dto: UpdateMenuAttributesDto,
  ) {
    return this.menusService.setGlobalAttributes(
      id,
      dto.globalAttributes ?? {},
    );
  }

  @Patch('items/:itemId/attributes')
  @ApiOperation({ summary: 'Set item-level attribute overrides' })
  setItemAttributes(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemAttributesDto,
  ) {
    return this.menusService.setItemAttributes(
      itemId,
      dto.itemAttributes ?? {},
    );
  }

  @Post('generate-content')
  @ApiOperation({
    summary: 'Generate description and SEO tags using AI',
  })
  generateContent(@Body() body: any) {
    return this.menusService.generateAIContent(body);
  }

  @Post('generate-modifiers')
  @ApiOperation({
    summary:
      'Generate intelligent modifier suggestions for a menu item using AI',
  })
  generateModifiers(@Body() body: any) {
    return this.menusService.generateModifiers(body);
  }

  @Post('suggest-reusable-modifiers')
  @ApiOperation({
    summary:
      'Get intelligent reusable modifier suggestions based on product category',
  })
  suggestReusableModifiers(@Body() body: any) {
    return this.menusService.suggestReusableModifiers(body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a menu (or unlink it from a specific site)',
  })
  async remove(@Param('id') id: string, @Query('siteId') siteId?: string) {
    await this.menusService.remove(id, siteId);
    return { success: true };
  }
}
