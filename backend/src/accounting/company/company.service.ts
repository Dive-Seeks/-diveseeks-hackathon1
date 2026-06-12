import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaCompany } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { WORLD_TAX_RATES } from '../seeds/tax-rates.seed';
import { WORLD_CURRENCIES } from '../seeds/currencies.seed';
import { UNIVERSAL_CHART_OF_ACCOUNTS } from '../../seeds/chart-of-accounts.seed';
import { CaTaxRate } from '../tax/tax-rate.entity';
import { CaCurrency } from '../currency/currency.entity';
import { CaAccount } from '../accounts/account.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(CaCompany) private repo: Repository<CaCompany>,
    @InjectRepository(CaTaxRate) private taxRepo: Repository<CaTaxRate>,
    @InjectRepository(CaCurrency) private currencyRepo: Repository<CaCurrency>,
    @InjectRepository(CaAccount) private accountRepo: Repository<CaAccount>,
  ) {}

  async findOrCreate(
    tenantId: string,
    dto: CreateCompanyDto,
  ): Promise<CaCompany> {
    const existing = await this.repo.findOne({ where: { tenantId } });
    if (existing) return existing;

    const company = this.repo.create({ tenantId, ...dto });
    const saved = await this.repo.save(company);

    // Seed world currencies (once per company) — skip if already exist
    const currencyCount = await this.currencyRepo.count();
    if (currencyCount === 0) {
      await this.currencyRepo.save(
        WORLD_CURRENCIES.map((c) => this.currencyRepo.create(c)),
      );
    }

    // Seed country-specific tax rates for this tenant
    const taxSeeds = WORLD_TAX_RATES.map((t) =>
      this.taxRepo.create({ ...t, tenantId }),
    );
    await this.taxRepo.save(taxSeeds);

    // Seed Universal Chart of Accounts
    const accountMap = new Map<string, CaAccount>();

    // First pass: save accounts without parents
    for (const seed of UNIVERSAL_CHART_OF_ACCOUNTS) {
      const account = this.accountRepo.create({
        tenantId,
        companyId: saved.id,
        code: seed.code,
        name: seed.name,
        type: seed.type,
        subType: seed.subType,
        isSystemAccount: true,
      });
      const savedAcc = await this.accountRepo.save(account);
      accountMap.set(seed.code, savedAcc);
    }

    // Second pass: set parents
    for (const seed of UNIVERSAL_CHART_OF_ACCOUNTS) {
      if ((seed as any).parentCode) {
        const child = accountMap.get(seed.code);
        const parent = accountMap.get((seed as any).parentCode);
        if (child && parent) {
          child.parentId = parent.id;
          await this.accountRepo.save(child);
        }
      }
    }

    return saved;
  }

  async findByTenant(tenantId: string): Promise<CaCompany | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  async update(
    tenantId: string,
    dto: Partial<CreateCompanyDto>,
  ): Promise<CaCompany> {
    await this.repo.update({ tenantId }, dto);
    return this.repo.findOne({ where: { tenantId } }) as Promise<CaCompany>;
  }
}
