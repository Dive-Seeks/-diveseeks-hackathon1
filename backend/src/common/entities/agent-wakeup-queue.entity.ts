import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Agent } from '../../agents/entities/agent.entity';

/**
 * AgentWakeupQueue — Paperclip pattern.
 * BullMQ wakeup events backed by a DB table for concurrency policies
 * (skip_if_active, coalesced, always_enqueue) and scheduled dispatch.
 */
@Entity('agent_wakeup_queue')
@Index(['tenantId'])
@Index(['assigneeAgentId'])
@Index(['status'])
@Index(['scheduledAt'])
export class AgentWakeupQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar' })
  domain: string;

  @Column({ name: 'assignee_agent_id', type: 'uuid' })
  assigneeAgentId: string;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignee_agent_id' })
  assigneeAgent: Agent;

  @Column({ name: 'trigger_kind', type: 'varchar' })
  triggerKind: string; // 'cron' | 'manual' | 'event' | 'chat'

  @Column({
    name: 'concurrency_policy',
    type: 'varchar',
    default: 'skip_if_active',
  })
  concurrencyPolicy: string; // 'skip_if_active' | 'coalesced' | 'always_enqueue'

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // 'pending' | 'picked_up' | 'completed' | 'skipped'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
