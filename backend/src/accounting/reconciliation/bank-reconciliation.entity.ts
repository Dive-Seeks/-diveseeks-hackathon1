import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

export enum BrsStatus {
  DRAFT = 'DRAFT',
  RECONCILED = 'RECONCILED',
}

export enum BrsItemType {
  OUTSTANDING_CHEQUE = 'OUTSTANDING_CHEQUE',
  DEPOSIT_IN_TRANSIT = 'DEPOSIT_IN_TRANSIT',
  BANK_CHARGE = 'BANK_CHARGE',
  BANK_ERROR = 'BANK_ERROR',
  BOOK_ERROR = 'BOOK_ERROR',
  INTEREST_EARNED = 'INTEREST_EARNED',
  STANDING_ORDER = 'STANDING_ORDER',
  DIRECT_DEBIT = 'DIRECT_DEBIT',
}

export enum BrsAdjustmentSide {
  ADDS_TO_BOOK = 'ADDS_TO_BOOK',
  DEDUCTS_FROM_BOOK = 'DEDUCTS_FROM_BOOK',
  ADDS_TO_BANK = 'ADDS_TO_BANK',
  DEDUCTS_FROM_BANK = 'DEDUCTS_FROM_BANK',
}

@Entity('ca_bank_reconciliations')
@Index(['tenantId', 'bankAccountId', 'statementDate'])
export class CaBankReconciliation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) tenantId: string;
  @Column({ type: 'uuid' }) bankAccountId: string;
  @Column({ type: 'date' }) statementDate: Date;
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  statementBalance: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) bookBalance: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  adjustedBookBalance: number;
  @Column({ type: 'enum', enum: BrsStatus, default: BrsStatus.DRAFT })
  status: BrsStatus;

  @OneToMany(() => CaBrsItem, (item) => item.reconciliation, {
    cascade: true,
    eager: true,
  })
  items: CaBrsItem[];

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('ca_brs_items')
export class CaBrsItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: BrsItemType }) itemType: BrsItemType;
  @Column() description: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: BrsAdjustmentSide })
  adjustmentSide: BrsAdjustmentSide;
  @Column({ type: 'uuid', nullable: true }) journalEntryId: string | null;

  @ManyToOne(() => CaBankReconciliation, (r) => r.items)
  reconciliation: CaBankReconciliation;

  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
