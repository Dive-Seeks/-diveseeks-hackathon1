import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CaBankReconciliation,
  BrsStatus,
  BrsAdjustmentSide,
} from './bank-reconciliation.entity';
import { CreateBrsDto } from './dto/create-brs.dto';
import { JournalService } from '../journal/journal.service';

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectRepository(CaBankReconciliation)
    private readonly brsRepo: Repository<CaBankReconciliation>,
    private readonly journalService: JournalService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateBrsDto,
  ): Promise<CaBankReconciliation> {
    const { bankAccountId, statementDate } = dto;

    // Get the book balance as of the statement date
    const accountBalance = await this.journalService.getAccountBalance(
      tenantId,
      bankAccountId,
      undefined,
      undefined,
      new Date(statementDate),
    );
    const bookBalance = accountBalance.balance;

    const reconciliation = this.brsRepo.create({
      tenantId,
      ...dto,
      bookBalance,
      adjustedBookBalance: bookBalance, // will be recalculated on reconcile
    });

    return this.brsRepo.save(reconciliation);
  }

  async reconcile(tenantId: string, id: string): Promise<any> {
    const brs = await this.brsRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['items'],
    });
    if (!brs) throw new NotFoundException('Bank reconciliation not found');
    if (brs.status === BrsStatus.RECONCILED)
      throw new UnprocessableEntityException('Already reconciled');

    let adjustedBook = Number(brs.bookBalance);
    let adjustedBank = Number(brs.statementBalance);

    for (const item of brs.items) {
      const amount = Number(item.amount);
      switch (item.adjustmentSide) {
        case BrsAdjustmentSide.ADDS_TO_BOOK:
          adjustedBook += amount;
          break;
        case BrsAdjustmentSide.DEDUCTS_FROM_BOOK:
          adjustedBook -= amount;
          break;
        case BrsAdjustmentSide.ADDS_TO_BANK:
          adjustedBank += amount;
          break;
        case BrsAdjustmentSide.DEDUCTS_FROM_BANK:
          adjustedBank -= amount;
          break;
      }
    }

    const difference = Math.abs(adjustedBook - adjustedBank);

    if (difference >= 0.01) {
      return {
        isReconciled: false,
        difference,
        adjustedBook,
        adjustedBank,
        unmatched: brs.items, // Ideally return unmatched items logically
      };
    }

    brs.adjustedBookBalance = adjustedBook;
    brs.status = BrsStatus.RECONCILED;
    await this.brsRepo.save(brs);

    return {
      isReconciled: true,
      difference: 0,
      adjustedBook,
      adjustedBank,
      brs,
    };
  }

  async findAll(
    tenantId: string,
    bankAccountId?: string,
  ): Promise<CaBankReconciliation[]> {
    const where: any = { tenantId, isDeleted: false };
    if (bankAccountId) where.bankAccountId = bankAccountId;
    return this.brsRepo.find({ where, order: { statementDate: 'DESC' } });
  }

  async findById(tenantId: string, id: string): Promise<CaBankReconciliation> {
    const brs = await this.brsRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['items'],
    });
    if (!brs) throw new NotFoundException('Bank reconciliation not found');
    return brs;
  }
}
