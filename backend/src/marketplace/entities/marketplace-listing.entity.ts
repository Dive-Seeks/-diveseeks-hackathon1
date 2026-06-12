import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AssetType {
  PROMPT = 'prompt',
  AGENT = 'agent',
  PLUGIN = 'plugin',
  WORKFLOW = 'workflow',
  MCP_SERVER = 'mcp_server',
  SKILL_PACK = 'skill_pack',
}

export enum ListingVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
  TENANT_INTERNAL = 'tenant_internal',
}

export enum PriceModel {
  FREE = 'free',
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  USAGE_BASED = 'usage_based',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: AssetType })
  assetType: AssetType;

  @Column({ type: 'uuid', nullable: true })
  assetId: string;

  @Column({ type: 'uuid', nullable: true })
  publisherTenantId: string;

  @Column({ type: 'uuid' })
  publisherUserId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @Column({ type: 'uuid', nullable: true })
  currentVersionId: string;

  @Column({
    type: 'enum',
    enum: ListingVisibility,
    default: ListingVisibility.PUBLIC,
  })
  visibility: ListingVisibility;

  @Column({ length: 50, nullable: true })
  licenseSpdx: string;

  @Column({ type: 'enum', enum: PriceModel, default: PriceModel.FREE })
  priceModel: PriceModel;

  @Column({ type: 'int', nullable: true })
  pricePence: number;

  @Column({ default: 0 })
  installCount: number;

  @Column({ type: 'numeric', precision: 2, scale: 1, default: 0.0 })
  rating: number;

  @Column({ default: 0 })
  ratingCount: number;

  @Column({ default: false })
  verified: boolean;

  @Column({
    type: 'enum',
    enum: ModerationStatus,
    default: ModerationStatus.PENDING,
  })
  moderation: ModerationStatus;

  @Column({ type: 'jsonb', nullable: true })
  agentCardJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  mcpManifestJson: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
