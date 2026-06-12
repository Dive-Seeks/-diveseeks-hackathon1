import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EmotionalState =
  | 'neutral'
  | 'confused'
  | 'frustrated'
  | 'anxious'
  | 'defensive';
export type AlertRoute = 'meeting_room' | 'separate_talk';

@Entity('user_behavior_alerts')
@Index(['tenantId', 'userId'])
export class UserBehaviorAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ name: 'trigger_reason', type: 'text' }) triggerReason: string;
  @Column({
    name: 'emotional_state',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  emotionalState: EmotionalState | null;
  @Column({ name: 'signal_ids', type: 'uuid', array: true, default: [] })
  signalIds: string[];
  @Column({ name: 'routed_to', length: 20, default: 'meeting_room' })
  routedTo: AlertRoute;
  @Column({ name: 'acknowledged', default: false }) acknowledged: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
