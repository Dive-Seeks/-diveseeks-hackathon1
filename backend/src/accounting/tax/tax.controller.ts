import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { CalculateTaxDto } from './dto/calculate-tax.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/tax-rates')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Get()
  findAll(
    @Request() req: { user: { tenantId: string } },
    @Query('countryCode') countryCode?: string,
  ) {
    return this.taxService.findAll(req.user.tenantId, countryCode);
  }

  @Post()
  create(
    @Request() req: { user: { tenantId: string } },
    @Body() dto: CreateTaxDto,
  ) {
    return this.taxService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateTaxDto,
  ) {
    return this.taxService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  deactivate(
    @Request() req: { user: { tenantId: string } },
    @Param('id') id: string,
  ) {
    return this.taxService.deactivate(req.user.tenantId, id);
  }

  @Post('calculate')
  calculateTax(@Body() dto: CalculateTaxDto) {
    return this.taxService.calculateTax(
      dto.buyerCountry,
      dto.amount,
      dto.buyerVatNumber,
    );
  }
}
