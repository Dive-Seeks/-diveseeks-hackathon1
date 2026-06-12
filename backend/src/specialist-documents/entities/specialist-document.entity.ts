import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { toSql, fromSql } from 'pgvector';

@Entity('specialist_documents')
@Index(['tenantId', 'projectId'])
@Index(['tenantId', 'projectId', 'specialistId', 'title'], { unique: true })
export class SpecialistDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'specialist_id' })
  specialistId: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({ name: 'document_type', default: 'general' })
  documentType: string;

  @Column({ default: 1 })
  version: number;

  @Column({
    type: 'vector',
    nullable: true,
    transformer: {
      to: (v: number[] | null) => (v ? toSql(v) : null),
      from: (v: string | null) => (v ? fromSql(v) : null),
    },
  })
  embedding: number[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
