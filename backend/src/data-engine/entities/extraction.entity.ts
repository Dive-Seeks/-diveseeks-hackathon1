import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('data_engine_extractions')
export class Extraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  repo_id: string;

  @Column({ type: 'uuid' })
  source_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'text' })
  claim: string;

  @Column({ type: 'float' })
  confidence: number;

  @Column({ type: 'int', nullable: true })
  source_page: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  source_quote: string;

  @Column({ type: 'varchar', length: 50 })
  domain: string;

  @Column({ type: 'text', array: true, default: '{}' })
  entity_refs: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  contradicts: string[];

  @Column({ type: 'varchar', length: 20, default: 'accepted' })
  status: 'accepted' | 'contradicted' | 'resolved' | 'rejected';

  @Column({ type: 'text', nullable: true })
  resolution_note: string;

  @CreateDateColumn()
  created_at: Date;
}
