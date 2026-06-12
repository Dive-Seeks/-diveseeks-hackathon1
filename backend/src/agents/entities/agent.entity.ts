import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export type AgentRole =
  | 'global-ceo'
  | 'industry-ceo'
  | 'ceo'
  | 'coordinator'
  | 'specialist'
  | 'manager'
  | 'night-team';

export type AgentStatus = 'idle' | 'active' | 'suspended' | 'terminated';

@Entity('agents')
@Index(['tenantId'])
@Index(['domain'])
@Index(['status'])
@Index(['reportsToId'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @Column({ type: 'varchar', nullable: true })
  title: string;

  @Column({ name: 'reports_to_id', type: 'uuid', nullable: true })
  reportsToId: string | null;

  @ManyToOne(() => Agent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reports_to_id' })
  reportsTo: Agent | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  industry: string | null;

  @Column({ type: 'varchar', nullable: true })
  domain: string;

  @Column({ name: 'adapter_type', default: 'nestjs' })
  adapterType: string;

  @Column({ name: 'adapter_config', type: 'jsonb', nullable: true })
  adapterConfig: Record<string, any> | null;

  @Column({ name: 'skill_path', type: 'varchar', nullable: true })
  skillPath: string | null;

  @Column({
    name: 'budget_monthly_cents',
    type: 'decimal',
    precision: 12,
    scale: 0,
    default: 0,
  })
  budgetMonthlyCents: number;

  @Column({ default: 'idle' })
  status: AgentStatus;

  @Column({ name: 'hired_by_agent_id', type: 'uuid', nullable: true })
  hiredByAgentId: string | null;

  @Column({ name: 'hired_at', type: 'timestamptz', nullable: true })
  hiredAt: Date | null;

  @Column({ name: 'terminated_at', type: 'timestamptz', nullable: true })
  terminatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
