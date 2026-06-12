import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  CaJournalEntry,
  JournalStatus,
  JournalType,
} from './journal-entry.entity';
import { CaJournalLine, EntryType } from './journal-line.entity';
import { CaCompany } from '../company/company.entity';
import { CreateJournalDto } from './dto/create-journal.dto';
import { ListJournalDto } from './dto/list-journal.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { createVoucher } from 'ledgerstack-core';

@Injectable()
export class JournalService {
  constructor(
    @InjectRepository(CaJournalEntry)
    private journalRepo: Repository<CaJournalEntry>,
    @InjectRepository(CaJournalLine)
    private lineRepo: Repository<CaJournalLine>,
    @InjectRepository(CaCompany) private companyRepo: Repository<CaCompany>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  private async generateEntryNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.journalRepo.count({ where: { tenantId } });
    return `JE-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async createEntry(
    tenantId: string,
    dto: CreateJournalDto,
  ): Promise<CaJournalEntry> {
    const company = await this.companyRepo.findOne({ where: { tenantId } });
    if (!company) throw new NotFoundException('Company not found');
    if (!company.isActive) {
      throw new ForbiddenException(
        'Cannot create journal entries for an inactive company.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const totalDebits = dto.lines
        .filter((l) => l.entryType === EntryType.DEBIT)
        .reduce((sum, l) => sum + Number(l.amount), 0);
      const totalCredits = dto.lines
        .filter((l) => l.entryType === EntryType.CREDIT)
        .reduce((sum, l) => sum + Number(l.amount), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new BadRequestException(
          `INVALID JOURNAL: Debits (${totalDebits}) ≠ Credits (${totalCredits}). Must balance to zero.`,
        );
      }

      const entryNumber = await this.generateEntryNumber(tenantId);

      // 1. Create entry in our primary TypeORM tables (for compatibility and easy querying)
      const entry = manager.create(CaJournalEntry, {
        tenantId,
        companyId: company.id,
        siteId: dto.siteId ?? null,
        entryNumber,
        memo: dto.memo,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        type: dto.type || JournalType.GENERAL,
        status: JournalStatus.POSTED,
        currency: dto.currency || company.baseCurrency || 'GBP',
        exchangeRate: dto.exchangeRate || 1,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
      });

      entry.lines = dto.lines.map((l) =>
        manager.create(CaJournalLine, {
          entryType: l.entryType,
          amount: l.amount,
          baseAmount: l.amount * (dto.exchangeRate || 1),
          accountId: l.accountId,
          description: l.description,
          taxCode: l.taxCode,
          taxRate: l.taxRate || 0,
          taxAmount: l.taxAmount || 0,
        }),
      );

      const savedEntry = await manager.save(CaJournalEntry, entry);

      // 2. Mirror the entry in LedgerStack Core for robust reporting and audit
      try {
        // Map voucher type
        const voucherTypeMap: Partial<Record<JournalType, any>> = {
          [JournalType.GENERAL]: 'JOURNAL',
          [JournalType.SALES]: 'SALES',
          [JournalType.PURCHASE]: 'PURCHASE',
          [JournalType.PAYMENT]: 'PAYMENT',
          [JournalType.RECEIPT]: 'RECEIPT',
          [JournalType.PAYROLL]: 'JOURNAL',
          [JournalType.DEPRECIATION]: 'ADJUSTMENT',
          [JournalType.TAX_ADJUSTMENT]: 'ADJUSTMENT',
          [JournalType.OPENING_BALANCE]: 'OPENING',
          [JournalType.ACCRUAL]: 'ADJUSTMENT',
          [JournalType.PREPAYMENT]: 'ADJUSTMENT',
          [JournalType.CAPEX]: 'JOURNAL',
          [JournalType.OPEX]: 'JOURNAL',
          [JournalType.BANK_CHARGES]: 'JOURNAL',
          [JournalType.RECTIFICATION]: 'ADJUSTMENT',
          [JournalType.RECONSTRUCTION]: 'JOURNAL',
        };

        await createVoucher({
          company_id: tenantId, // Using tenantId as company_id for simplicity
          reference_id: entryNumber,
          voucher_type: voucherTypeMap[dto.type as JournalType] || 'JOURNAL',
          date: savedEntry.entryDate.toISOString().split('T')[0],
          narration: dto.memo,
          entries: dto.lines.map((l) => ({
            account_id: l.accountId,
            debit: l.entryType === EntryType.DEBIT ? Number(l.amount) : 0,
            credit: l.entryType === EntryType.CREDIT ? Number(l.amount) : 0,
            currency: dto.currency || 'GBP',
            exchange_rate: dto.exchangeRate || 1,
          })),
        });
      } catch (err) {
        console.error(
          'Failed to mirror entry to LedgerStack Core:',
          err.message,
        );
        // We don't fail the primary transaction here as LedgerStack might need its own setup (years/accounts)
        // In production, we should ensure accounts are synced first.
      }

      return savedEntry;
    });
  }

  async voidEntry(
    tenantId: string,
    id: string,
    reason: string,
  ): Promise<CaJournalEntry> {
    const original = await this.journalRepo.findOne({
      where: { id, tenantId },
      relations: ['lines'],
    });
    if (!original) throw new NotFoundException('Journal entry not found');
    if (original.status === JournalStatus.VOIDED)
      throw new BadRequestException('Entry already voided');

    return this.dataSource.transaction(async (manager) => {
      original.status = JournalStatus.VOIDED;
      original.voidReason = reason;
      original.voidedAt = new Date();
      await manager.save(CaJournalEntry, original);

      const reversal = manager.create(CaJournalEntry, {
        tenantId,
        siteId: original.siteId,
        entryNumber: await this.generateEntryNumber(tenantId),
        memo: `REVERSAL: ${original.memo} — ${reason}`,
        entryDate: new Date(),
        type: original.type,
        status: JournalStatus.REVERSED,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        reversalOf: original.id,
      });

      reversal.lines = original.lines.map((l) =>
        manager.create(CaJournalLine, {
          entryType:
            l.entryType === EntryType.DEBIT
              ? EntryType.CREDIT
              : EntryType.DEBIT,
          amount: l.amount,
          baseAmount: l.baseAmount,
          accountId: l.accountId,
          description: `Reversal: ${l.description || ''}`,
          taxCode: l.taxCode,
          taxRate: l.taxRate,
          taxAmount: l.taxAmount,
        }),
      );

      return manager.save(CaJournalEntry, reversal);
    });
  }

  async getAccountBalance(
    tenantId: string,
    accountId: string,
    siteId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const query = this.lineRepo
      .createQueryBuilder('line')
      .innerJoin('line.journalEntry', 'entry')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.tenantId = :tenantId', { tenantId })
      .andWhere('entry.status = :status', { status: JournalStatus.POSTED });

    if (siteId) query.andWhere('entry.siteId = :siteId', { siteId });
    if (startDate && endDate)
      query.andWhere('entry.entryDate BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    const lines = await query.getMany();
    const totalDebits = lines
      .filter((l) => l.entryType === EntryType.DEBIT)
      .reduce((s, l) => s + Number(l.baseAmount), 0);
    const totalCredits = lines
      .filter((l) => l.entryType === EntryType.CREDIT)
      .reduce((s, l) => s + Number(l.baseAmount), 0);
    const result = {
      accountId,
      siteId: siteId || 'all',
      totalDebits,
      totalCredits,
      balance: totalDebits - totalCredits,
    };
    return result;
  }

  async findById(tenantId: string, id: string): Promise<CaJournalEntry> {
    const entry = await this.journalRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['lines', 'lines.account'],
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async findAll(
    tenantId: string,
    dto: ListJournalDto,
  ): Promise<{ data: CaJournalEntry[]; total: number }> {
    const {
      from,
      to,
      status,
      type,
      accountId,
      siteId,
      page = 1,
      limit = 50,
    } = dto;
    const query = this.journalRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.lines', 'line')
      .leftJoinAndSelect('line.account', 'account')
      .where('entry.tenantId = :tenantId', { tenantId })
      .andWhere('entry.isDeleted = false');

    if (from) query.andWhere('entry.entryDate >= :from', { from });
    if (to) query.andWhere('entry.entryDate <= :to', { to });
    if (status) query.andWhere('entry.status = :status', { status });
    if (type) query.andWhere('entry.type = :type', { type });
    if (siteId) query.andWhere('entry.siteId = :siteId', { siteId });
    if (accountId) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM ca_journal_lines l WHERE l."journalEntryId" = entry.id AND l."accountId" = :accountId)',
        { accountId },
      );
    }

    query
      .orderBy('entry.entryDate', 'DESC')
      .addOrderBy('entry.createdAt', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getLedger(
    tenantId: string,
    accountId: string,
    dto: JournalFilterDto,
  ): Promise<any[]> {
    const { startDate, endDate, siteId } = dto;
    const query = this.lineRepo
      .createQueryBuilder('line')
      .innerJoinAndSelect('line.journalEntry', 'entry')
      .where('line.accountId = :accountId', { accountId })
      .andWhere('entry.tenantId = :tenantId', { tenantId })
      .andWhere('entry.status = :status', { status: JournalStatus.POSTED })
      .andWhere('entry.isDeleted = false')
      .andWhere('line.isDeleted = false');

    if (siteId) query.andWhere('entry.siteId = :siteId', { siteId });
    if (startDate)
      query.andWhere('entry.entryDate >= :startDate', { startDate });
    if (endDate) query.andWhere('entry.entryDate <= :endDate', { endDate });

    query
      .orderBy('entry.entryDate', 'ASC')
      .addOrderBy('entry.createdAt', 'ASC');

    const lines = await query.getMany();

    let balance = 0;
    const ledger = lines.map((line) => {
      const dr =
        line.entryType === EntryType.DEBIT ? Number(line.baseAmount) : 0;
      const cr =
        line.entryType === EntryType.CREDIT ? Number(line.baseAmount) : 0;
      balance += dr - cr; // Assuming natural debit balance for simplicity; normally we check account type
      return {
        id: line.id,
        date: line.journalEntry.entryDate,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description || line.journalEntry.memo,
        debit: dr,
        credit: cr,
        balance,
      };
    });

    return ledger;
  }
}
