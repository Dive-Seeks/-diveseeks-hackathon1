import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
  ApiOperation,
} from '@nestjs/swagger';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { BulkUpdateStorePricingDto } from './dto/store-pricing.dto';
import { SuggestBundlesDto } from './dto/suggest-bundles.dto';
import { AiSuggestionsService } from './services/ai-suggestions.service';

@ApiTags('modifiers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/modifiers')
export class ModifiersController {
  constructor(
    private readonly modifiersService: ModifiersService,
    private readonly aiSuggestionsService: AiSuggestionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new modifier with options' })
  create(@Body() createModifierDto: CreateModifierDto, @Req() req: any) {
    return this.modifiersService.create(
      createModifierDto,
      req.user?.businessId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all modifiers for current business' })
  findAll(@Req() req: any) {
    return this.modifiersService.findAll(req.user?.businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific modifier with options' })
  @ApiQuery({
    name: 'includeStorePricing',
    required: false,
    type: Boolean,
    description: 'Include store-specific pricing for all options',
  })
  findOne(
    @Param('id') id: string,
    @Query('includeStorePricing') includeStorePricing?: string,
  ) {
    return this.modifiersService.findOne(id, includeStorePricing === 'true');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a modifier and its options' })
  update(
    @Param('id') id: string,
    @Body() updateModifierDto: UpdateModifierDto,
  ) {
    return this.modifiersService.update(id, updateModifierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a modifier' })
  remove(@Param('id') id: string) {
    return this.modifiersService.remove(id);
  }

  @Post('store-pricing')
  @ApiOperation({
    summary: 'Update store-specific pricing for modifier options',
  })
  updateStorePricing(@Body() bulkUpdateDto: BulkUpdateStorePricingDto) {
    return this.modifiersService.updateStorePricing(bulkUpdateDto);
  }

  @Get('options/:optionId/store-pricing')
  @ApiOperation({ summary: 'Get store-specific pricing for a modifier option' })
  getOptionStorePricing(@Param('optionId') optionId: string) {
    return this.modifiersService.getOptionStorePricing(optionId);
  }

  @Post('menu-items/:menuItemId/modifiers/:modifierId')
  @ApiOperation({ summary: 'Link a modifier to a menu item' })
  linkToMenuItem(
    @Param('menuItemId') menuItemId: string,
    @Param('modifierId') modifierId: string,
    @Query('displayOrder') displayOrder?: string,
  ) {
    return this.modifiersService.linkToMenuItem(
      menuItemId,
      modifierId,
      displayOrder ? parseInt(displayOrder) : 0,
    );
  }

  @Delete('menu-items/:menuItemId/modifiers/:modifierId')
  @ApiOperation({ summary: 'Unlink a modifier from a menu item' })
  unlinkFromMenuItem(
    @Param('menuItemId') menuItemId: string,
    @Param('modifierId') modifierId: string,
  ) {
    return this.modifiersService.unlinkFromMenuItem(menuItemId, modifierId);
  }

  @Get('menu-items/:menuItemId/modifiers')
  @ApiOperation({ summary: 'Get all modifiers for a menu item' })
  getModifiersForMenuItem(@Param('menuItemId') menuItemId: string) {
    return this.modifiersService.getModifiersForMenuItem(menuItemId);
  }

  @Post('ai/suggest-bundles')
  @ApiOperation({
    summary: 'Get AI-powered modifier bundle suggestions for a menu item',
    description:
      'Analyzes the menu item and suggests the most relevant modifier templates using AI',
  })
  suggestBundles(@Body() suggestBundlesDto: SuggestBundlesDto) {
    return this.aiSuggestionsService.suggestBundles(suggestBundlesDto);
  }
}
