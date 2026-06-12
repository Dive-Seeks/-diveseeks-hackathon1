import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('research_jobs')
export class ResearchJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  query: string; // original research query

  @Column({ nullable: true, type: 'uuid' })
  tenantId: string | null; // null = global research job

  @Column({ nullable: true, type: 'uuid' })
  triggeredByTaskSessionId: string | null;

  @Column({ default: 'on_demand' })
  triggerType: 'on_demand' | 'tce_gap';

  @Column('simple-array', { default: '' })
  urlsScraped: string[]; // up to 5 URLs

  @Column('int', { default: 0 })
  chunksIndexed: number;

  @Column({ default: 'pending' })
  status:
    | 'pending'
    | 'scraping'
    | 'tokenizing'
    | 'indexing'
    | 'indexed'
    | 'failed';

  @Column({ nullable: true, type: 'text' })
  errorMessage: string | null;

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
