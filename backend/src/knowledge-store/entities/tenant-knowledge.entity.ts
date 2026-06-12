import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('tenant_knowledge')
export class TenantKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string; // always scoped — never null

  @Column({ nullable: true })
  webChunkId: string; // FK → web_chunks

  @Column('text')
  content: string;

  @Column('int')
  tokenCount: number;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ nullable: true })
  domain: string;

  @Column({
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? toSql(v) : null),
      from: (v: string | null) => (v ? fromSql(v) : null),
    },
  })
  embedding: number[] | null;

  @Column('int', { default: 0 })
  hitCount: number;

  @Column({ default: 'active' })
  status: 'active' | 'stale';

  @Column({ default: false })
  synthesized: boolean; // has this chunk been processed by the synthesis pass?

  @Column({ default: false })
  isSynthesis: boolean; // is this row a synthesized wiki page (not a raw chunk)?

  @CreateDateColumn()
  indexedAt: Date;
}
