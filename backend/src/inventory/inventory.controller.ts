import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createInventoryDto: CreateInventoryDto,
  ) {
    return this.inventoryService.create(createInventoryDto, tenantId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.inventoryService.findAll(tenantId, storeId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(tenantId, id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.remove(tenantId, id);
  }
}
