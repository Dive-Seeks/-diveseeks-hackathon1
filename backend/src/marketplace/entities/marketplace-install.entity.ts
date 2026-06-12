import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum InstallStatus {
  INSTALLED = 'installed',
  PENDING = 'pending',
  FAILED = 'failed',
  REMOVED = 'removed',
}

@Entity('marketplace_installs')
export class MarketplaceInstall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  listingId: string;

  @Column({ type: 'uuid' })
  versionId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  installedBy: string;

  @Column({ type: 'uuid', nullable: true })
  localAssetId: string;

  @Column({ type: 'enum', enum: InstallStatus, default: InstallStatus.PENDING })
  status: InstallStatus;

  @CreateDateColumn()
  installedAt: Date;
}
