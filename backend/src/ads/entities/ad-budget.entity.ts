import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ad_budgets')
@Index(['tenantId'], { unique: true })
export class AdBudget {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;

  /** Monthly ad spend budget in pence/cents (integer to avoid float rounding) */
  @Column({ name: 'monthly_budget_cents', type: 'int', default: 0 })
  monthlyBudgetCents: number;

  /** Spent so far this calendar month in cents */
  @Column({ name: 'spent_this_month_cents', type: 'int', default: 0 })
  spentThisMonthCents: number;

  /** ISO date when budget was last reset (start of month) */
  @Column({ name: 'last_reset_date', type: 'varchar', nullable: true })
  lastResetDate: string | null;

  /** Suggested upsell amount in cents shown to tenant */
  @Column({ name: 'suggested_increase_cents', type: 'int', default: 0 })
  suggestedIncreaseCents: number;

  /** Whether tenant has ever set a budget (used for onboarding prompt) */
  @Column({ name: 'is_set', default: false }) isSet: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
