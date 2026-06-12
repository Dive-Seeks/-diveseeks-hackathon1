import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CaAccount } from './account.entity';
import { CaJournalLine } from '../journal/journal-line.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountTreeDto } from './dto/account-tree.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(CaAccount) private repo: Repository<CaAccount>,
    @InjectRepository(CaJournalLine)
    private journalLineRepo: Repository<CaJournalLine>,
  ) {}

  async findAll(tenantId: string): Promise<CaAccount[]> {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async create(tenantId: string, dto: CreateAccountDto): Promise<CaAccount> {
    return this.repo.save(this.repo.create({ tenantId, ...dto }));
  }

  async findByCode(tenantId: string, code: string): Promise<CaAccount | null> {
    return this.repo.findOne({ where: { tenantId, code, isDeleted: false } });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<CaAccount> {
    const account = await this.repo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!account) throw new NotFoundException('Account not found');
    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async deactivate(tenantId: string, id: string): Promise<void> {
    const account = await this.repo.findOne({
      where: { id, tenantId, isDeleted: false },
    });
    if (!account) throw new NotFoundException('Account not found');

    const hasLines = await this.journalLineRepo.count({
      where: { accountId: id },
    });
    if (hasLines > 0) {
      throw new ConflictException(
        'Account has posted transactions. Deactivate instead of deleting.',
      );
    }

    account.isActive = false;
    account.isDeleted = true;
    account.deletedAt = new Date();
    await this.repo.save(account);
  }

  async getTree(tenantId: string): Promise<AccountTreeDto[]> {
    const allAccounts = await this.repo.find({
      where: { tenantId, isDeleted: false },
      order: { code: 'ASC' },
    });
    const map = new Map<string, any>();
    const roots: any[] = [];

    allAccounts.forEach((acc) => {
      map.set(acc.id, { ...acc, children: [], balance: 0 }); // balance would be fetched via JournalService in a full impl
    });

    allAccounts.forEach((acc) => {
      if (acc.parentId) {
        const parent = map.get(acc.parentId);
        if (parent) parent.children.push(map.get(acc.id));
      } else {
        roots.push(map.get(acc.id));
      }
    });

    return roots;
  }
}
