import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BrainSession } from './brain-session.entity';

@Entity('brain_ideas')
@Index(['sessionId', 'threadName'])
export class BrainIdea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => BrainSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: BrainSession;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    name: 'thread_name',
    type: 'varchar',
    length: 100,
    default: 'MAIN',
  })
  threadName: string;

  @Column('text')
  content: string;

  @Column({ name: 'batch_number', default: 1 })
  batchNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
