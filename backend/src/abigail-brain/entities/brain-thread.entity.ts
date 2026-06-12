import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BrainSession } from './brain-session.entity';

@Entity('brain_threads')
export class BrainThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => BrainSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: BrainSession;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'parent_thread',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  parentThread: string | null;

  @Column('text')
  topic: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
