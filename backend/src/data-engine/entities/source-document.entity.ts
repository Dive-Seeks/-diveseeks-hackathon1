import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('data_engine_sources')
export class SourceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  repo_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 64 })
  sha256: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'parsing' | 'analysing' | 'done' | 'error';

  @Column({ type: 'int', nullable: true })
  page_count: number;

  @Column({ type: 'int', default: 0 })
  claims_extracted: number;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'float', nullable: true })
  parse_quality: number;

  @CreateDateColumn()
  uploaded_at: Date;
}
