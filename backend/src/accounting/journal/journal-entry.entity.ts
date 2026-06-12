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
import { CaJournalLine } from './journal-line.entity';
import { CaCompany } from '../company/company.entity';

export enum JournalStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
  REVERSED = 'REVERSED',
}
export enum JournalType {
  GENERAL = 'GENERAL',
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  PAYROLL = 'PAYROLL',
  DEPRECIATION = 'DEPRECIATION',
  TAX_ADJUSTMENT = 'TAX_ADJUSTMENT',
  OPENING_BALANCE = 'OPENING_BALANCE',
  ACCRUAL = 'ACCRUAL',
  PREPAYMENT = 'PREPAYMENT',
  CAPEX = 'CAPEX',
  OPEX = 'OPEX',
  BANK_CHARGES = 'BANK_CHARGES',
  RECTIFICATION = 'RECTIFICATION',
  RECONSTRUCTION = 'RECONSTRUCTION',
}

@Entity('ca_journal_entries')
@Index(['tenantId', 'entryDate'])
export class CaJournalEntry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ type: 'uuid', nullable: true, name: 'site_id' }) siteId:
    | string
    | null;

  @Column({ type: 'uuid', nullable: true }) companyId: string | null;
  @ManyToOne(() => CaCompany, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company: CaCompany;

  @Column({ unique: true }) entryNumber: string;
  @Column() memo: string;
  @Column({ type: 'date' }) entryDate: Date;
  @Column({ type: 'enum', enum: JournalStatus, default: JournalStatus.DRAFT })
  status: JournalStatus;
  @Column({ type: 'enum', enum: JournalType, default: JournalType.GENERAL })
  type: JournalType;
  @Column({ default: 'GBP' }) currency: string;
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 1 })
  exchangeRate: number;
  @Column({ type: 'uuid', nullable: true }) voidedById: string | null;
  @Column({ type: 'varchar', nullable: true }) voidReason: string | null;
  @Column({ type: 'timestamptz', nullable: true }) voidedAt: Date | null;
  @Column({ type: 'uuid', nullable: true }) reversalOf: string | null;
  @Column({ type: 'varchar', nullable: true }) referenceType: string | null;
  @Column({ type: 'uuid', nullable: true }) referenceId: string | null;
  @OneToMany(() => CaJournalLine, (l) => l.journalEntry, {
    cascade: true,
    eager: true,
  })
  lines: CaJournalLine[];
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
