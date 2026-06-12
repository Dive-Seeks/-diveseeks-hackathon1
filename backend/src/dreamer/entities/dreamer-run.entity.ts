import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('dreamer_runs')
export class DreamerRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') tenantId: string;
  @Column('uuid') userId: string;
  @Column('int') turnsProcessed: number;
  @Column('int') preferencesExtracted: number;
  @Column({ type: 'enum', enum: ['success', 'failed', 'skipped'] })
  status: 'success' | 'failed' | 'skipped';
  @CreateDateColumn() createdAt: Date;
}
