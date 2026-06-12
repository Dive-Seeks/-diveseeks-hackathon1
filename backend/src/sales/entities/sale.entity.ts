import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from '../../setup-business/entities/store.entity';
import { Business } from '../../setup-business/entities/business.entity';
import { Site, SiteType } from '../../sites/entities/site.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_id', nullable: true })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @ManyToOne(() => Site)
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'jsonb' })
  items: any[];

  @Column({ type: 'jsonb', nullable: true })
  customer: { name: string; email: string; avatar?: string };

  @Column({ default: 'completed' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
