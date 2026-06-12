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
import { Business } from '../../setup-business/entities/business.entity';
import { Product } from '../../products/entities/product.entity';
import { Site, SiteType } from '../../sites/entities/site.entity';
import { Store } from '../../setup-business/entities/store.entity';

@Entity('prices')
@Index(['productId', 'storeId', 'siteId'], { unique: true })
export class Pricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'site_id', nullable: true })
  siteId: string | null;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site | null;

  @Column({ name: 'store_id', nullable: true })
  storeId: string | null;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store | null;

  @Column({ type: 'enum', enum: SiteType, nullable: true })
  channel: SiteType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'GBP' })
  currency: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'start_date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', nullable: true })
  endDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
