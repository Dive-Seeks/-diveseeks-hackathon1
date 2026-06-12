import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('lint_runs')
export class LintRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  repo_id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('int')
  total_issues: number;

  @Column('int')
  orphan_pages: number;

  @Column('int')
  stale_claims: number;

  @Column('int')
  missing_cross_refs: number;

  @Column('int')
  knowledge_gaps: number;

  @Column('int')
  sparse_nodes: number;

  @Column('int')
  research_triggered: number;

  @CreateDateColumn()
  created_at: Date;
}
