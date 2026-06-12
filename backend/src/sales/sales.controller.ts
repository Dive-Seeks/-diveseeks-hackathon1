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
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.create(createSaleDto, tenantId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.salesService.findAll(tenantId, storeId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(tenantId, id, updateSaleDto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.salesService.remove(tenantId, id);
  }
}
