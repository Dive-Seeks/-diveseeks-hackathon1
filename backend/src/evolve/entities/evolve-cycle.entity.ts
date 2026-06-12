import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('evolve_cycles')
export class EvolveCycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  specialistId: string;

  @Column('int')
  iteration: number;
  // 1–N (max iterations per nightly run: 10, matching Image 3)

  @Column('int')
  trainBatchSize: number;
  // How many trajectories evaluated in EVAL step (target: 50)

  @Column('int')
  valBatchSize: number;
  // How many tasks used in RE-EVAL step (target: 25)

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  trainWeakScore: number | null;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  trainStrongScore: number | null;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  trainGap: number | null;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  valWeakScore: number | null;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  valStrongScore: number | null;

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  valGap: number | null;

  @Column({ default: 'running' })
  status: 'running' | 'accepted' | 'rejected' | 'skipped';

  @Column('text', { nullable: true })
  diagnosis: string | null;

  @Column('uuid', { nullable: true })
  promptVersionId: string | null;
  // Which SpecialistPromptVersion was created/accepted in this cycle

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
