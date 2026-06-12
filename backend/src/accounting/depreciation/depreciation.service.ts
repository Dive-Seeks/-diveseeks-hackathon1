import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CaDepreciationSchedule,
  CaDepreciationEntry,
  DepreciationMethod,
} from './depreciation-schedule.entity';
import { CreateDepreciationScheduleDto } from './dto/create-depreciation-schedule.dto';
import { JournalService } from '../journal/journal.service';
import { JournalType } from '../journal/journal-entry.entity';
import { EntryType } from '../journal/journal-line.entity';
import { CaAccount } from '../accounts/account.entity';

@Injectable()
export class DepreciationService {
  constructor(
    @InjectRepository(CaDepreciationSchedule)
    private scheduleRepo: Repository<CaDepreciationSchedule>,
    @InjectRepository(CaDepreciationEntry)
    private entryRepo: Repository<CaDepreciationEntry>,
    @InjectRepository(CaAccount) private accountRepo: Repository<CaAccount>,
    private readonly journalService: JournalService,
  ) {}

  async createSchedule(
    tenantId: string,
    dto: CreateDepreciationScheduleDto,
  ): Promise<CaDepreciationSchedule> {
    const schedule = this.scheduleRepo.create({
      tenantId,
      ...dto,
      netBookValue: dto.costPrice,
      accumulatedDepreciation: 0,
      acquisitionDate: new Date(dto.acquisitionDate),
    });
    return this.scheduleRepo.save(schedule);
  }

  async getSchedule(
    tenantId: string,
    id: string,
  ): Promise<CaDepreciationSchedule> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id, tenantId, isDeleted: false },
      relations: ['entries'],
    });
    if (!schedule)
      throw new NotFoundException('Depreciation schedule not found');
    return schedule;
  }

  async findAll(tenantId: string): Promise<CaDepreciationSchedule[]> {
    return this.scheduleRepo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async runPeriodDepreciation(
    tenantId: string,
    periodDate: Date,
  ): Promise<CaDepreciationEntry[]> {
    const activeSchedules = await this.scheduleRepo.find({
      where: { tenantId, isActive: true, isDeleted: false },
    });
    const newEntries: CaDepreciationEntry[] = [];

    // We assume there's a specific system account for Depreciation Expense
    const expenseAccount = await this.accountRepo.findOne({
      where: { tenantId, code: '6400', isDeleted: false },
    });
    if (!expenseAccount)
      throw new BadRequestException(
        'Depreciation Expense account (6400) not found',
      );

    for (const schedule of activeSchedules) {
      const currentNBV = Number(schedule.netBookValue);
      const residualValue = Number(schedule.residualValue);
      const costPrice = Number(schedule.costPrice);

      if (currentNBV <= residualValue) continue; // Fully depreciated

      let charge = 0;
      if (schedule.method === DepreciationMethod.STRAIGHT_LINE) {
        if (!schedule.usefulLifeYears)
          throw new BadRequestException(
            'Useful life years required for straight line method',
          );
        charge = (costPrice - residualValue) / schedule.usefulLifeYears;
      } else if (schedule.method === DepreciationMethod.REDUCING_BALANCE) {
        charge = currentNBV * Number(schedule.annualRate);
      } else {
        // Units of production not fully automated here without usage data
        continue;
      }

      // NBV floor — never depreciate below residual
      if (currentNBV - charge < residualValue) {
        charge = currentNBV - residualValue;
      }

      if (charge <= 0) continue;

      const newNBV = currentNBV - charge;
      const accumulated = Number(schedule.accumulatedDepreciation) + charge;

      // Find the accumulated depreciation account for the asset
      // Usually it is a sub-account or specifically mapped. Here we use a generic mapping or assumption
      // Frank Wood standard: 1511 for 1510
      const assetAccount = await this.accountRepo.findOne({
        where: { id: schedule.assetAccountId },
      });
      let accumAccId = schedule.assetAccountId; // Fallback
      if (assetAccount) {
        const accumCode = assetAccount.code.slice(0, 3) + '1'; // Simple assumption: 1510 -> 1511
        const accumAcc = await this.accountRepo.findOne({
          where: { tenantId, code: accumCode },
        });
        if (accumAcc) accumAccId = accumAcc.id;
      }

      // Create Journal Entry
      const je = await this.journalService.createEntry(tenantId, {
        memo: `Depreciation for ${schedule.assetName}`,
        entryDate: periodDate.toISOString(),
        type: JournalType.DEPRECIATION,
        lines: [
          {
            accountId: expenseAccount.id,
            entryType: EntryType.DEBIT,
            amount: charge,
          },
          {
            accountId: accumAccId,
            entryType: EntryType.CREDIT,
            amount: charge,
          },
        ],
      });

      const entry = this.entryRepo.create({
        scheduleId: schedule.id,
        periodDate,
        charge,
        closingNBV: newNBV,
        journalEntryId: je.id,
      });

      schedule.netBookValue = newNBV;
      schedule.accumulatedDepreciation = accumulated;

      if (newNBV <= residualValue) {
        schedule.isActive = false; // Mark as fully depreciated
      }

      await this.scheduleRepo.save(schedule);
      const savedEntry = await this.entryRepo.save(entry);
      newEntries.push(savedEntry);
    }

    return newEntries;
  }
}
