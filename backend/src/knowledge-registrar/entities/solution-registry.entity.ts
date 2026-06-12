import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kr_solutions')
export class SolutionRegistry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 64 })
  @Index({ unique: true })
  problemHash: string;

  @Column()
  errorType: string;

  @Column({ type: 'char', length: 64 })
  contextFingerprint: string;

  @Column({ type: 'text' })
  solution: string;

  @Column({ type: 'jsonb', default: {} })
  solutionPayload: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  solvedByMcpId: string | null;

  @Column({ type: 'varchar', nullable: true })
  solvedBySpecialistId: string | null;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failureCount: number;

  @Column({ type: 'float', default: 1.0 })
  confidenceScore: number;

  @Column({
    type: 'vector',
    nullable: true,
    comment: 'pgvector embedding for semantic fallback lookup',
  })
  embedding: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
