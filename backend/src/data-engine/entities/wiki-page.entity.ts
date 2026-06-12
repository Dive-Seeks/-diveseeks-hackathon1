import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('data_engine_wiki_pages')
export class WikiPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  repo_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 50 })
  domain: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  source_ids: string[];

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? toSql(v) : null),
      from: (v: string | null) => (v ? fromSql(v) : null),
    },
  })
  embedding: number[] | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
