import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('global_knowledge')
export class GlobalKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  webChunkId: string; // FK → web_chunks

  @Column('text')
  content: string;

  @Column('int')
  tokenCount: number;

  @Column({ type: 'text', nullable: true })
  sourceUrl: string;

  @Column({ type: 'text', nullable: true })
  domain: string; // 'robotics' | 'healthcare' | etc

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
  hitCount: number; // how many times retrieved

  @Column({ default: 'active' })
  status: 'active' | 'stale'; // for soft-delete support

  @Column({ default: false })
  synthesized: boolean; // has this chunk been processed by the synthesis pass?

  @Column({ default: false })
  isSynthesis: boolean; // is this row a synthesized wiki page (not a raw chunk)?

  @CreateDateColumn()
  indexedAt: Date;
}
