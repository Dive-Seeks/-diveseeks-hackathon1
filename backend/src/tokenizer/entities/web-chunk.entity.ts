import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('web_chunks')
export class WebChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  researchJobId: string; // FK → research_jobs

  @Column()
  sourceUrl: string;

  @Column('text')
  content: string; // cleaned text chunk

  @Column('int')
  tokenCount: number; // exact tiktoken count

  @Column('int')
  chunkIndex: number; // position within source doc

  @Column({
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? toSql(v) : null),
      from: (v: string | null) => (v ? fromSql(v) : null),
    },
  })
  embedding: number[]; // 768-dim vector (text-embedding-005 via VertexEmbeddingService)

  @Column({ nullable: true, type: 'uuid' })
  tenantId: string | null; // null = global knowledge

  @Column({ default: 'active' })
  status: 'active' | 'stale' | 'superseded';

  @CreateDateColumn()
  indexedAt: Date;
}
