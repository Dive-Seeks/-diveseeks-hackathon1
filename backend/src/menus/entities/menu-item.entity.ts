import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Menu } from './menu.entity';
import { MenuCategory } from './menu-category.entity';
import { Product } from '../../products/entities/product.entity';
import { MenuItemModifier } from '../../modifiers/entities/menu-item-modifier.entity';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_id' })
  menuId: string;

  @ManyToOne(() => Menu, (menu) => menu.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => MenuCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: MenuCategory;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => MenuItemModifier, (mim) => mim.menuItem)
  modifiers: MenuItemModifier[];

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'seo_tags', nullable: true })
  seoTags: string;

  @Column({ name: 'item_attributes', type: 'simple-json', nullable: true })
  itemAttributes: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
