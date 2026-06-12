import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type SignalType =
  | 'topic_repeat'
  | 'rapid_send'
  | 'tab_switch'
  | 'rephrase'
  | 'angry_burst'
  | 'long_pause'
  | 'message_sent';
export type SignalWeight = 'LOW' | 'MEDIUM' | 'HIGH';

@Entity('user_behavior_signals')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'userId', 'topicHash'])
export class UserBehaviorSignal {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ name: 'session_id', type: 'uuid', nullable: true }) sessionId:
    | string
    | null;
  @Column({ name: 'signal_type', type: 'varchar', length: 50 })
  signalType: SignalType;
  @Column({ name: 'signal_weight', type: 'varchar', length: 20 })
  signalWeight: SignalWeight;
  @Column({ name: 'topic_hash', type: 'varchar', length: 64, nullable: true })
  topicHash: string | null;
  @Column({ name: 'raw_message', type: 'text', nullable: true })
  rawMessage: string | null;
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
