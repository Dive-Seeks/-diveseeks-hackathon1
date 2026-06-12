import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tenant_budgets')
export class TenantBudget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tenantId: string;

  @Column('int', { default: 500 })
  monthlyLimitCents: number; // default: 500 ($5.00)

  @Column('int', { default: 0 })
  spentCents: number; // running total for current window

  // UTC window — reset on first day of each month
  @Column()
  windowStart: Date; // first day of current month 00:00 UTC

  @Column()
  windowEnd: Date; // first day of next month 00:00 UTC

  @Column({ default: false })
  paused: boolean; // true = hard stop; no LLM calls

  @Column({ type: 'timestamp', nullable: true })
  pausedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  pauseReason: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
