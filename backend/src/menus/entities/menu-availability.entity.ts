import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Menu } from './menu.entity';
import { MenuItem } from './menu-item.entity';
import { Site } from '../../sites/entities/site.entity';
import { Store } from '../../setup-business/entities/store.entity';

@Entity('menu_availability')
export class MenuAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_id', nullable: true })
  menuId: string;

  @ManyToOne(() => Menu, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ name: 'menu_item_id', nullable: true })
  menuItemId: string;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'site_id', nullable: true })
  siteId: string;

  @ManyToOne(() => Site, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({ name: 'store_id', nullable: true })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'day_of_week' })
  dayOfWeek: string; // e.g., 'Monday'

  @Column({ name: 'start_time' })
  startTime: string; // Format: HH:mm

  @Column({ name: 'end_time' })
  endTime: string; // Format: HH:mm

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
