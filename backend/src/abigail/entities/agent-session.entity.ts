import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AgentSessionStatus =
  | 'running'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'stalled'
  | 'failed'
  | 'completed';

@Entity('agent_sessions')
@Index(['tenantId', 'domain'])
@Index(['tenantId', 'status'])
export class AgentSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'site_id', nullable: true }) siteId: string;
  @Column() domain: string;
  @Column({ default: 'running' }) status: AgentSessionStatus;
  @Column({ name: 'current_step', default: 0 }) currentStep: number;
  @Column({ name: 'strategy_preset', default: 'balanced' })
  strategyPreset: string;
  @Column({ name: 'last_compaction_savings', type: 'jsonb', nullable: true })
  lastCompactionSavings: number[] | null;

  @Column({ type: 'jsonb', nullable: true }) journey: object | null;
  @Column({ name: 'business_type', type: 'varchar', nullable: true })
  businessType: string | null;
  @Column('text', { array: true, nullable: true }) cuisines: string[] | null;
  @Column('text', { array: true, nullable: true }) keywords: string[] | null;
  @Column({ name: 'dietary_type', type: 'varchar', nullable: true })
  dietaryType: string | null;
  @Column({ name: 'spice_range', type: 'varchar', nullable: true }) spiceRange:
    | string
    | null;
  @Column({ name: 'service_model', type: 'varchar', nullable: true })
  serviceModel: string | null;
  @Column({ name: 'allergen_policy', type: 'varchar', nullable: true })
  allergenPolicy: string | null;
  @Column({ name: 'hygiene_rating', type: 'varchar', nullable: true })
  hygieneRating: string | null;
  @Column({ name: 'shared_kitchen', default: false }) sharedKitchen: boolean;
  @Column({ name: 'allergen_notice', type: 'varchar', nullable: true })
  allergenNotice: string | null;

  @Column({ name: 'domain_context', type: 'jsonb', nullable: true })
  domainContext: object | null;
  @Column({ name: 'pending_approval', type: 'jsonb', nullable: true })
  pendingApproval: object | null;
  @Column({ name: 'last_rejection', type: 'jsonb', nullable: true })
  lastRejection: object | null;

  @Column({ name: 'approved_categories', type: 'jsonb', nullable: true })
  approvedCategories: object[] | null;
  @Column({ name: 'approved_items', type: 'jsonb', nullable: true })
  approvedItems: object[] | null;
  @Column({ name: 'approved_modifiers', type: 'jsonb', nullable: true })
  approvedModifiers: object[] | null;
  @Column({ name: 'global_attributes', type: 'jsonb', nullable: true })
  globalAttributes: object | null;
  @Column({ name: 'approved_results', type: 'jsonb', nullable: true })
  approvedResults: Record<string, object> | null;

  @Column({ name: 'agent_stats', type: 'jsonb', nullable: true }) agentStats:
    | object
    | null;
  @Column({ name: 'validation_retry_count', default: 0 })
  validationRetryCount: number;
  @Column({ name: 'specialist_calls', type: 'jsonb', nullable: true })
  specialistCalls: object[] | null;
  @Column({ name: 'budget_exhausted', default: false })
  budgetExhausted: boolean;

  @Column({ name: 'last_heartbeat_at', type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date | null;
  @Column({ name: 'total_input_tokens', default: 0 }) totalInputTokens: number;
  @Column({ name: 'total_output_tokens', default: 0 })
  totalOutputTokens: number;
  @Column({
    name: 'total_cost_usd',
    type: 'decimal',
    precision: 10,
    scale: 6,
    default: 0,
  })
  totalCostUsd: number;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
