import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('data_repos')
export class DataRepo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  purpose: string;

  @Column({ type: 'varchar', length: 20, default: 'building' })
  status: 'building' | 'active' | 'error';

  @Column({ type: 'varchar', length: 20, default: 'general' })
  repo_type: 'general' | 'spec';

  @Column({ type: 'int', default: 0 })
  page_count: number;

  @Column({ type: 'int', default: 0 })
  pending_contradictions: number;

  /** Schema layer — wiki conventions, domain taxonomy, page format rules (Karpathy pattern) */
  @Column({ type: 'text', nullable: true })
  schema: string;

  @Column({ type: 'timestamp', nullable: true })
  last_ingest_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_lint_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
