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
import { Business } from '../../setup-business/entities/business.entity';
import { SiteMenu } from './site-menu.entity';
import { MenuCategory } from './menu-category.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'seo_tags', nullable: true })
  seoTags: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @Column({ default: 'GBP' })
  currency: string;

  @Column({ name: 'global_attributes', type: 'simple-json', nullable: true })
  globalAttributes: Record<string, any> | null;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => SiteMenu, (siteMenu) => siteMenu.menu)
  siteMenus: SiteMenu[];

  @OneToMany(() => MenuCategory, (category) => category.menu)
  categories: MenuCategory[];

  @OneToMany(() => MenuItem, (item) => item.menu)
  items: MenuItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
