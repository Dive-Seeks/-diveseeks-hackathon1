import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('store_images')
@Index(['tenantId', 'storeId'])
@Index(['tenantId', 'siteId'])
@Index(['tenantId', 'storeId', 'createdAt'])
@Index(['tenantId', 'siteId', 'createdAt'])
export class StoreImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'site_id', type: 'uuid', nullable: true })
  siteId?: string | null;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'ftp_path' })
  ftpPath: string; // /tenants/{tenantId}/stores/{storeId}/gallery/image.jpg

  @Column({ name: 'ftp_url' })
  ftpUrl: string; // Full public URL

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string; // URL to thumbnail version

  @Column({ name: 'file_size' })
  fileSize: number; // in bytes

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  width?: number | null;

  @Column({ type: 'int', nullable: true })
  height?: number | null;

  @Column('simple-array', { nullable: true })
  tags?: string[] | null; // ['menu', 'pizza', 'featured']

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number; // How many times this image is referenced

  @Column({ name: 'used_by_products', type: 'jsonb', default: [] })
  usedByProducts: string[]; // Array of product IDs

  @Column({ name: 'used_by_categories', type: 'jsonb', default: [] })
  usedByCategories: string[]; // Array of category IDs

  @Column({ name: 'last_accessed_at', type: 'timestamp', nullable: true })
  lastAccessedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
