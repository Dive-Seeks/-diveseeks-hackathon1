import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum McpCredentialStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  ROTATED = 'rotated',
}

@Entity('mcp_credentials')
export class McpCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  mcpId: string;

  @Column({ type: 'jsonb' })
  encryptedKey: { iv: string; authTag: string; ciphertext: string };

  @Column({ default: McpCredentialStatus.ACTIVE })
  status: McpCredentialStatus;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  rotatedFromId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
