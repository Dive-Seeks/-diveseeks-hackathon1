import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('team_registry')
export class TeamRegistration {
  @PrimaryColumn('varchar', { name: 'team_name', length: 20 })
  teamName: string;

  @Column('varchar', { name: 'display_name', length: 60 })
  displayName: string;

  @Column('jsonb', { name: 'default_flags', default: () => "'[]'::jsonb" })
  defaultFlags: string[];

  @Column('int', { name: 'max_iterations', default: 5 })
  maxIterations: number;

  @Column('int', { name: 'iteration_timeout_seconds', default: 180 })
  iterationTimeoutSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
