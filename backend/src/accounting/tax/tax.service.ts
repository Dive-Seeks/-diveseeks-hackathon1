import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CaTaxRate } from './tax-rate.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import SalesTax from 'sales-tax';
import { checkVAT } from 'jsvat';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(CaTaxRate) private taxRepo: Repository<CaTaxRate>,
  ) {}

  async getTaxRate(
    tenantId: string,
    countryCode: string,
    taxCode?: string,
    date?: Date,
  ): Promise<CaTaxRate | null> {
    const query = this.taxRepo
      .createQueryBuilder('tax')
      .where('tax.tenantId = :tenantId', { tenantId })
      .andWhere('tax.countryCode = :countryCode', { countryCode })
      .andWhere('tax.isActive = :isActive', { isActive: true })
      .andWhere('tax.isDeleted = false');

    if (taxCode) {
      query.andWhere('tax.code = :taxCode', { taxCode });
    }

    if (date) {
      query
        .andWhere('(tax.effectiveFrom IS NULL OR tax.effectiveFrom <= :date)', {
          date,
        })
        .andWhere('(tax.effectiveTo IS NULL OR tax.effectiveTo >= :date)', {
          date,
        });
    }

    return query.getOne();
  }

  async calculateTax(
    buyerCountry: string,
    amount: number,
    buyerVatNumber?: string,
  ) {
    if (buyerVatNumber) {
      const isValidVat = checkVAT(buyerVatNumber);
      if (!isValidVat.isValid) {
        throw new BadRequestException(
          `Invalid VAT number provided: ${buyerVatNumber}`,
        );
      }
    }

    const tax = await SalesTax.getSalesTax(buyerCountry, null, buyerVatNumber);
    const taxAmount = amount * tax.rate;
    return {
      buyerCountry,
      netAmount: amount,
      taxRate: tax.rate,
      taxRatePercent: (tax.rate * 100).toFixed(2) + '%',
      taxAmount,
      grossAmount: amount + taxAmount,
      isReverseCharge: tax.type === 'reverse',
    };
  }

  async getCountryRates(
    tenantId: string,
    countryCode: string,
  ): Promise<CaTaxRate[]> {
    return this.taxRepo.find({
      where: { tenantId, countryCode, isActive: true, isDeleted: false },
    });
  }

  async create(tenantId: string, dto: CreateTaxDto): Promise<CaTaxRate> {
    const taxRate = this.taxRepo.create({ ...dto, tenantId });
    return this.taxRepo.save(taxRate);
  }

  async findAll(tenantId: string, countryCode?: string): Promise<CaTaxRate[]> {
    const where: FindOptionsWhere<CaTaxRate> = { tenantId, isDeleted: false };
    if (countryCode) where.countryCode = countryCode;
    return this.taxRepo.find({ where });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTaxDto,
  ): Promise<CaTaxRate> {
    const taxRate = await this.taxRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!taxRate) throw new NotFoundException('Tax rate not found');
    Object.assign(taxRate, dto);
    return this.taxRepo.save(taxRate);
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    const taxRate = await this.taxRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!taxRate) throw new NotFoundException('Tax rate not found');
    taxRate.isActive = false;
    taxRate.isDeleted = true;
    taxRate.deletedAt = new Date();
    await this.taxRepo.save(taxRate);
  }
}
