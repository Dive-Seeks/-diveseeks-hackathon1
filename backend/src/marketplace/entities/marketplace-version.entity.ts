import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('marketplace_versions')
export class MarketplaceVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  listingId: string;

  @Column({ length: 30 })
  version: string;

  @Column({ type: 'char', length: 64 })
  contentHash: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  dependencies: Array<{
    listingId: string;
    version: string;
    required: boolean;
  }>;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
