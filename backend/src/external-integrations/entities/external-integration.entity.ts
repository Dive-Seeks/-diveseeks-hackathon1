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
import { Product } from '../../products/entities/product.entity';
import { Site } from '../../sites/entities/site.entity';

export enum ExternalPlatform {
  UBER_EATS = 'UBER_EATS',
  JUST_EAT = 'JUST_EAT',
  DELIVEROO = 'DELIVEROO',
}

@Entity('external_mappings')
@Index(['productId', 'siteId', 'externalPlatform'], { unique: true })
export class ExternalIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'site_id' })
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({
    name: 'external_platform',
    type: 'enum',
    enum: ExternalPlatform,
  })
  externalPlatform: ExternalPlatform;

  @Column({ name: 'external_id' })
  externalId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
