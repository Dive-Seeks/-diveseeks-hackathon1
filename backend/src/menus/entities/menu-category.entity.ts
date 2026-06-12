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
import { Menu } from './menu.entity';

@Entity('menu_categories')
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_id' })
  menuId: string;

  @ManyToOne(() => Menu, (menu) => menu.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => MenuCategory, (category) => category.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuCategory;

  @OneToMany(() => MenuCategory, (category) => category.parent)
  children: MenuCategory[];

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'seo_tags', nullable: true })
  seoTags: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
