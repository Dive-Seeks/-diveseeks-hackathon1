import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GithubInstallation } from './github-installation.entity';

export type GithubRepoIndexStatus =
  | 'pending'
  | 'indexing'
  | 'ready'
  | 'stale'
  | 'failed';

@Entity('github_repos')
@Index(['teamId', 'repoFullName'], { unique: true })
export class GithubRepo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @ManyToOne(() => GithubInstallation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'installationId' })
  installation: GithubInstallation;

  @Column()
  installationId: string;

  @Column({ nullable: true, type: 'uuid' })
  projectId: string | null;

  @Column()
  repoFullName: string;

  @Column({ default: 'main' })
  defaultBranch: string;

  @Column({ nullable: true, type: 'int' })
  webhookId: number | null;

  @Column({ type: 'text', nullable: true })
  webhookSecret: string | null; // AES-256-GCM encrypted

  @Column({ default: 'pending' })
  indexStatus: GithubRepoIndexStatus;

  @Column({ nullable: true, type: 'timestamp' })
  lastIndexedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  indexedCommitSha: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  deletedAt: Date | null;
}
