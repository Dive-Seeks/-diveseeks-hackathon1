import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CaCompany } from '../company/company.entity';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}
export enum AccountSubType {
  CURRENT_ASSET = 'CURRENT_ASSET',
  FIXED_ASSET = 'FIXED_ASSET',
  BANK = 'BANK',
  CASH = 'CASH',
  RECEIVABLE = 'RECEIVABLE',
  INVENTORY = 'INVENTORY',
  CURRENT_LIABILITY = 'CURRENT_LIABILITY',
  LONG_TERM_LIABILITY = 'LONG_TERM_LIABILITY',
  PAYABLE = 'PAYABLE',
  TAX_PAYABLE = 'TAX_PAYABLE',
  SHARE_CAPITAL = 'SHARE_CAPITAL',
  RETAINED_EARNINGS = 'RETAINED_EARNINGS',
  DRAWINGS = 'DRAWINGS',
  OPERATING_REVENUE = 'OPERATING_REVENUE',
  OTHER_INCOME = 'OTHER_INCOME',
  COGS = 'COGS',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  PAYROLL = 'PAYROLL',
  DEPRECIATION = 'DEPRECIATION',
  TAX_EXPENSE = 'TAX_EXPENSE',
}

@Entity('ca_accounts')
@Index(['tenantId', 'code'])
export class CaAccount {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ type: 'enum', enum: AccountType }) type: AccountType;
  @Column({ type: 'enum', enum: AccountSubType }) subType: AccountSubType;
  @Column({ nullable: true }) description: string;
  @Column({ default: 'GBP' }) currency: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @Column({ default: false }) isSystemAccount: boolean;

  @Column({ type: 'uuid', nullable: true }) companyId: string | null;
  @ManyToOne(() => CaCompany, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: CaCompany;

  @ManyToOne(() => CaAccount, (a) => a.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: CaAccount;
  @Column({ nullable: true }) parentId: string;
  @OneToMany(() => CaAccount, (a) => a.parent) children: CaAccount[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
