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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(createProductDto, tenantId);
  }

  @Get()
  findAll(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
  ) {
    return this.productsService.findAll(tenantId, category);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(tenantId, id, updateProductDto);
  }

  @Delete(':id')
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.productsService.remove(tenantId, id);
  }
}
