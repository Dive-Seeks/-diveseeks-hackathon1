import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('github_source_documents')
@Index(['projectId', 'filePath', 'chunkIndex'], { unique: true })
export class GithubSourceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  projectId: string;

  @Column()
  filePath: string;

  @Column()
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? toSql(v) : null),
      from: (v: string | null) => (v ? fromSql(v) : null),
    },
  })
  embedding: number[] | null;

  @Column({ default: 'main' })
  branch: string;

  @Column({ type: 'text', nullable: true })
  commitSha: string | null;

  @Column({ type: 'text', nullable: true })
  language: string | null;

  @Column({ default: 0 })
  tokenCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
