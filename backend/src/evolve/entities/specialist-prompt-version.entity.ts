import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Unique(['specialistId', 'version'])
@Entity('specialist_prompt_versions')
export class SpecialistPromptVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  specialistId: string;
  // Active code specialists: 'rex' | 'nova' | 'kai' | 'sage' | 'pixel' | 'felix'

  @Column('int')
  version: number;
  // Monotonically increasing. v1 = hardcoded default. v2+ = evolved.

  @Column('text')
  systemPrompt: string;
  // Full system prompt text for this version

  @Column({ default: false })
  isActive: boolean;
  // Only ONE version per specialistId is active at any time

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  weakScore: number | null;
  // Avg weak model score that triggered this version (null for v1)

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  strongScore: number | null;
  // Avg strong model score that triggered this version

  @Column('decimal', { precision: 4, scale: 3, nullable: true })
  gapScore: number | null;
  // strongScore - weakScore at time of acceptance

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected' | 'rolled_back';

  @Column('text', { nullable: true })
  diagnosis: string | null;
  // What the analyzer found (e.g. "WEAK_TOO_HIGH: context leaks answer")

  @Column('text', { nullable: true })
  changeDescription: string | null;
  // What the implementer changed and why (human-readable)

  @Column('uuid', { nullable: true })
  parentVersionId: string | null;
  // Which version this evolved from — full lineage tree

  @Column('text', { array: true, default: [] })
  sourceTrajectoryIds: string[];
  // Trajectory IDs used for this evolution cycle

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date | null;
}
