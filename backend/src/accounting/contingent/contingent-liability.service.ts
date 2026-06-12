import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CaContingentLiability,
  ContingencyProbability,
} from './contingent-liability.entity';
import { CreateContingentDto } from './dto/create-contingent.dto';
import { JournalService } from '../journal/journal.service';
import { JournalType } from '../journal/journal-entry.entity';
import { EntryType } from '../journal/journal-line.entity';
import { CaAccount } from '../accounts/account.entity';

@Injectable()
export class ContingentLiabilityService {
  constructor(
    @InjectRepository(CaContingentLiability)
    private contingentRepo: Repository<CaContingentLiability>,
    @InjectRepository(CaAccount) private accountRepo: Repository<CaAccount>,
    private readonly journalService: JournalService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateContingentDto,
  ): Promise<CaContingentLiability> {
    const liability = this.contingentRepo.create({ tenantId, ...dto });
    return this.contingentRepo.save(liability);
  }

  async findAll(tenantId: string): Promise<CaContingentLiability[]> {
    return this.contingentRepo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<CreateContingentDto>,
  ): Promise<CaContingentLiability> {
    const liability = await this.contingentRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!liability)
      throw new NotFoundException('Contingent liability not found');
    Object.assign(liability, dto);
    return this.contingentRepo.save(liability);
  }

  async recognise(tenantId: string, id: string): Promise<any> {
    const liability = await this.contingentRepo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!liability)
      throw new NotFoundException('Contingent liability not found');

    // Prudence gate
    if (liability.probability !== ContingencyProbability.VIRTUALLY_CERTAIN) {
      throw new ForbiddenException(
        'Only virtually certain contingencies can be recognised as journal entries.',
      );
    }

    if (liability.isRecognised) {
      throw new ForbiddenException('Already recognised');
    }

    // In a real implementation, the accounts would be passed or configured.
    // For this spec, we mock the accounts.
    const expenseAccount = await this.accountRepo.findOne({
      where: { tenantId, code: '6600', isDeleted: false },
    }); // Professional fees/Legal
    const provisionAccount = await this.accountRepo.findOne({
      where: { tenantId, code: '2300', isDeleted: false },
    }); // Accrued expenses/Provision

    if (!expenseAccount || !provisionAccount) {
      throw new ForbiddenException(
        'Required accounts for recognition not found (6600 / 2300)',
      );
    }

    const amount = Number(liability.estimatedAmount || 0);

    const je = await this.journalService.createEntry(tenantId, {
      memo: `Recognition of Contingent Liability: ${liability.description}`,
      entryDate: new Date().toISOString(),
      type: JournalType.GENERAL,
      lines: [
        { accountId: expenseAccount.id, entryType: EntryType.DEBIT, amount },
        { accountId: provisionAccount.id, entryType: EntryType.CREDIT, amount },
      ],
    });

    liability.isRecognised = true;
    await this.contingentRepo.save(liability);

    return je;
  }
}
