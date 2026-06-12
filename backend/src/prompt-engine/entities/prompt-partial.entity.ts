import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('prompt_partials')
export class PromptPartial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ length: 120 })
  slug: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'char', length: 64 })
  contentHash: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
