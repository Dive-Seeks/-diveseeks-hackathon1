import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SandboxStatus =
  | 'creating'
  | 'ready'
  | 'hibernated'
  | 'destroyed'
  | 'error';

@Entity('sandbox_records')
export class SandboxRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  taskSessionId: string;

  @Column()
  projectId: string;

  @Column({ nullable: true })
  containerId: string; // null in mock mode

  @Column({ default: 'creating' })
  status: SandboxStatus;

  @Column({ nullable: true })
  workspacePath: string; // /workspace/{projectId} in docker, host path in mock

  @Column({ type: 'jsonb', nullable: true })
  ports: Record<number, number>; // containerPort → hostPort

  @Column({ default: false })
  isMock: boolean; // true when SANDBOX_MODE=mock

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true, type: 'int' })
  peakMemoryMb: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  destroyedAt: Date;
}
