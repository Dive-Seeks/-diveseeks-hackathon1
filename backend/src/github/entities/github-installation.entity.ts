import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('github_installations')
export class GithubInstallation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  teamId: string;

  @Column()
  githubUserId: string;

  @Column()
  githubLogin: string;

  @Column({ type: 'text' })
  accessToken: string; // AES-256-GCM encrypted via AiKeyVaultService

  @Column({ default: 'repo,read:user' })
  tokenScope: string;

  @CreateDateColumn()
  connectedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  revokedAt: Date | null;
}
