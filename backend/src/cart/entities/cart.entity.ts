import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Site } from '../../sites/entities/site.entity';
import { Store } from '../../setup-business/entities/store.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @ManyToOne(() => Site)
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
