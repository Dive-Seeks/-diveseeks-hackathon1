import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type VerdictOutcome =
  | 'warned'
  | 'counter_proposed'
  | 'overridden'
  | 'accepted';

@Entity('architectural_verdicts')
@Index(['projectId', 'createdAt'])
export class ArchitecturalVerdict {
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

  @Column({ length: 50 })
  domain: string;

  @Column({ length: 20 })
  projectTier: string;

  @Column({ type: 'varchar', length: 20 })
  outcome: VerdictOutcome;

  @Column({ type: 'text', nullable: true })
  developerReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
