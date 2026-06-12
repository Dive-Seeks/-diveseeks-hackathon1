import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaCurrency } from './currency.entity';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import * as accounting from 'accounting-js';
import * as fx from 'money';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(CaCurrency) private currencyRepo: Repository<CaCurrency>,
  ) {}

  async formatMoney(amount: number, currencyCode: string): Promise<string> {
    const currency = await this.currencyRepo.findOne({
      where: { code: currencyCode },
    });
    if (!currency) return `${currencyCode} ${amount.toFixed(2)}`;
    return accounting.formatMoney(amount, {
      symbol: currency.symbol,
      precision: currency.decimalPlaces,
      thousand: currency.thousandSeparator,
      decimal: currency.decimalSeparator,
    });
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const currencies = await this.currencyRepo.find();

    // Setup money.js with current rates from DB
    fx.base = 'USD';
    fx.rates = currencies.reduce(
      (acc, curr) => {
        acc[curr.code] = curr.exchangeRateToUSD;
        return acc;
      },
      { USD: 1 },
    );

    try {
      return fx.convert(amount, { from: fromCurrency, to: toCurrency });
    } catch (e) {
      // Fallback to manual calculation if fx fails or currency missing
      const from = currencies.find((c) => c.code === fromCurrency);
      const to = currencies.find((c) => c.code === toCurrency);
      if (!from || !to)
        throw new Error(`Currency not found: ${fromCurrency} or ${toCurrency}`);
      return (amount / from.exchangeRateToUSD) * to.exchangeRateToUSD;
    }
  }

  async findAll(activeOnly?: boolean): Promise<CaCurrency[]> {
    const where: any = { isDeleted: false };
    if (activeOnly) where.isActive = true;
    return this.currencyRepo.find({ where });
  }

  async findByCode(code: string): Promise<CaCurrency> {
    const currency = await this.currencyRepo.findOne({
      where: { code, isDeleted: false },
    });
    if (!currency) throw new NotFoundException(`Currency ${code} not found`);
    return currency;
  }

  async updateRate(code: string, rate: number): Promise<CaCurrency> {
    const currency = await this.findByCode(code);
    currency.exchangeRateToUSD = rate;
    currency.lastFetchedAt = new Date();
    return this.currencyRepo.save(currency);
  }

  async convert(
    dto: ConvertCurrencyDto,
  ): Promise<{ result: number; rate: number }> {
    const result = await this.convertCurrency(
      dto.amount,
      dto.fromCurrency,
      dto.toCurrency,
    );
    const rate = await this.convertCurrency(
      1,
      dto.fromCurrency,
      dto.toCurrency,
    );
    return { result, rate };
  }
}
