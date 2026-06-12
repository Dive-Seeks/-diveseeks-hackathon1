import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Menu } from './menu.entity';
import { Site } from '../../sites/entities/site.entity';

@Entity('site_menus')
@Unique(['siteId', 'menuId'])
export class SiteMenu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'site_id' })
  siteId: string;

  @ManyToOne(() => Site)
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({ name: 'menu_id' })
  menuId: string;

  @ManyToOne(() => Menu, (menu) => menu.siteMenus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
