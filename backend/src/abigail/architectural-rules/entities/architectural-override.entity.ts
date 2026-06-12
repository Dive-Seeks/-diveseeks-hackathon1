import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('architectural_overrides')
@Index(['projectId', 'ruleId', 'resolvedAt'])
export class ArchitecturalOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  tenantId: string;

  @Column()
  sessionId: string;

  @Column({ length: 20 })
  ruleId: string;

  @Column({ type: 'text' })
  developerReason: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
