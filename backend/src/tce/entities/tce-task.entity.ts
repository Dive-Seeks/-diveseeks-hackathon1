import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpecialistId } from '../../abigail/entities/task-session.entity';

@Entity('tce_tasks')
export class TCETask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  goalId: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  specialist: SpecialistId;

  @Column({ nullable: true })
  alsoSpecialist?: SpecialistId;

  @Column('int')
  priority: number;

  @Column()
  source: 'tce' | 'user';

  @Column()
  status: 'queued' | 'in_progress' | 'done' | 'blocked' | 'needs_review';

  @Column({ nullable: true })
  sessionId: string;

  @Column('float')
  taskSizeMultiplier: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
