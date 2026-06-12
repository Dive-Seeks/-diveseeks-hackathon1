import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sandbox_sessions')
export class SandboxSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  taskSessionId: string | null; // links to task_sessions

  @Column({ type: 'varchar', nullable: true })
  coordinatorJobId: string | null;

  @Column()
  image: string; // Docker image: 'node:20-alpine', 'python:3.12-slim', etc.

  @Column('jsonb', { default: {} })
  envVars: Record<string, string>;

  @Column({ type: 'varchar' })
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'timeout';

  @Column({ type: 'varchar', nullable: true })
  containerId: string | null; // Docker container ID

  // Execution bounds
  @Column('int', { default: 300000 })
  maxDurationMs: number; // default 300_000 (5 min)

  @Column('int', { default: 0 })
  totalDurationMs: number; // accumulated across heartbeats

  // Last command result (for resume context)
  @Column({ type: 'jsonb', nullable: true })
  lastResult: {
    command: string;
    exitCode: number;
    stdout: string; // trimmed to 10_000 chars
    stderr: string;
    durationMs: number;
  } | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
