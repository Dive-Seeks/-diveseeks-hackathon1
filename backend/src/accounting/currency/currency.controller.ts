import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrencyService } from './currency.service';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  findAll(@Query('activeOnly') activeOnly?: boolean) {
    // If activeOnly query param is provided as 'true' string, convert to boolean
    const isActiveOnly =
      activeOnly !== undefined ? String(activeOnly) === 'true' : undefined;
    return this.currencyService.findAll(isActiveOnly);
  }

  @Get(':code')
  findByCode(@Param('code') code: string) {
    return this.currencyService.findByCode(code.toUpperCase());
  }

  @Patch(':code/rate')
  updateRate(@Param('code') code: string, @Body('rate') rate: number) {
    return this.currencyService.updateRate(code.toUpperCase(), Number(rate));
  }

  @Post('convert')
  convert(@Body() dto: ConvertCurrencyDto) {
    return this.currencyService.convert(dto);
  }
}
