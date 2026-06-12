import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('flag_registry')
export class FlagRegistration {
  @PrimaryColumn('varchar', { name: 'flag_key', length: 80 })
  flagKey: string;

  @Column('varchar', { length: 20 })
  team: string;

  @Column('text')
  description: string;

  @Column('jsonb', { name: 'evidence_shape', default: () => "'{}'::jsonb" })
  evidenceShape: Record<string, unknown>;

  @Column('varchar', { name: 'evaluator_id', length: 80 })
  evaluatorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
