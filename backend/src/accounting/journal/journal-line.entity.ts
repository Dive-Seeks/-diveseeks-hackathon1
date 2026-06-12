import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CaJournalEntry } from './journal-entry.entity';
import { CaAccount } from '../accounts/account.entity';

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

@Entity('ca_journal_lines')
export class CaJournalLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: EntryType }) entryType: EntryType;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 15, scale: 2 }) baseAmount: number;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) taxCode: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;
  @ManyToOne(() => CaAccount, { eager: true })
  @JoinColumn({ name: 'accountId' })
  account: CaAccount;
  @Column() accountId: string;
  @ManyToOne(() => CaJournalEntry, (j) => j.lines)
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: CaJournalEntry;
  @Column() journalEntryId: string;
  @Column({ default: false }) isDeleted: boolean;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
