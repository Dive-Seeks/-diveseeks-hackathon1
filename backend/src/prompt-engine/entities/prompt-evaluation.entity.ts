import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum ScorerType {
  HUMAN = 'human',
  WEAK_JUDGE = 'weak_judge',
  STRONG_JUDGE = 'strong_judge',
  AUTO_HEURISTIC = 'auto_heuristic',
}

@Entity('prompt_evaluations')
export class PromptEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid' })
  promptVersionId: string;

  @Column({ type: 'uuid', nullable: true })
  evalSetId: string;

  @Column({ type: 'numeric', precision: 4, scale: 3, nullable: true })
  score: number;

  @Column({
    type: 'enum',
    enum: ScorerType,
    default: ScorerType.AUTO_HEURISTIC,
  })
  scorerType: ScorerType;

  @Column({ type: 'text', nullable: true })
  output: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
