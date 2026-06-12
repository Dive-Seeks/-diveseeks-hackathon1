import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  InventoryValuationService,
  CreateInventoryValuationDto,
} from './inventory-valuation.service';

@UseGuards(JwtAuthGuard)
@Controller('accounting/inventory')
export class InventoryController {
  constructor(private readonly service: InventoryValuationService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateInventoryValuationDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('product/:productId')
  findByProduct(@Request() req: any, @Param('productId') productId: string) {
    return this.service.findByProduct(req.user.tenantId, productId);
  }

  @Get('product/:productId/latest')
  getLatest(@Request() req: any, @Param('productId') productId: string) {
    return this.service.getLatest(req.user.tenantId, productId);
  }
}
