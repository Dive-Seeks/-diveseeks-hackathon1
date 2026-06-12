import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('api_fusion_credentials')
@Unique(['tenantId', 'blueprintId'])
export class ApiFusionCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @Column('uuid')
  blueprintId: string;

  @Column('jsonb')
  encryptedCredentials: { iv: string; authTag: string; ciphertext: string };
  // AES-256-GCM encrypted. Never decrypted outside CredentialVaultService.

  @Column({ length: 20, default: 'pending' })
  authStatus: 'pending' | 'valid' | 'expired' | 'revoked';

  @Column('timestamp', { nullable: true })
  lastVerifiedAt: Date | null;

  @Column('timestamp', { nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
