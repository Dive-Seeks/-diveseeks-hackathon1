import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CampaignStatus =
  | 'active'
  | 'paused'
  | 'killed'
  | 'scaling'
  | 'pending_scale_approval'
  | 'completed';
export type AdPlatform = 'meta' | 'google' | 'tiktok' | 'internal';
export type KillReason =
  | 'spend_floor_hit'
  | 'cost_per_result_exceeded'
  | 'manual'
  | null;

@Entity('ad_campaigns')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'platform'])
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;

  @Column({ name: 'campaign_name' }) campaignName: string;
  @Column({ name: 'platform', type: 'varchar', default: 'internal' })
  platform: AdPlatform;

  /** Budget allocated to this campaign in cents */
  @Column({ name: 'allocated_budget_cents', type: 'int', default: 0 })
  allocatedBudgetCents: number;
  /** Actual spend so far in cents */
  @Column({ name: 'spent_cents', type: 'int', default: 0 }) spentCents: number;

  @Column({ name: 'impressions', type: 'int', default: 0 }) impressions: number;
  @Column({ name: 'clicks', type: 'int', default: 0 }) clicks: number;
  @Column({ name: 'conversions', type: 'int', default: 0 }) conversions: number;

  /** Cost per result in cents (spent / conversions). NULL if no conversions yet */
  @Column({ name: 'cost_per_result_cents', type: 'int', nullable: true })
  costPerResultCents: number | null;

  /** Benchmark cost-per-result ceiling for this business type in cents */
  @Column({ name: 'benchmark_cpr_cents', type: 'int', default: 500 })
  benchmarkCprCents: number;

  /** Hours the campaign has been running */
  @Column({ name: 'hours_running', type: 'int', default: 0 })
  hoursRunning: number;

  @Column({ name: 'status', type: 'varchar', default: 'active' })
  status: CampaignStatus;
  @Column({ name: 'kill_reason', type: 'varchar', nullable: true })
  killReason: KillReason;

  /** Scale recommendation message shown to tenant */
  @Column({ name: 'scale_recommendation', type: 'text', nullable: true })
  scaleRecommendation: string | null;

  /** Suggested additional budget cents for scaling */
  @Column({ name: 'scale_suggested_cents', type: 'int', nullable: true })
  scaleSuggestedCents: number | null;

  @Column({ name: 'start_date', type: 'date' }) startDate: string;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate:
    | string
    | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
