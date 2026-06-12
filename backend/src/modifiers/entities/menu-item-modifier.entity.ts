import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { MenuItem } from '../../menus/entities/menu-item.entity';
import { Modifier } from './modifier.entity';

/**
 * MenuItemModifier Entity
 *
 * Junction table linking menu items to their applicable modifiers
 * Allows same modifier to be reused across multiple menu items
 *
 * Example:
 * - Margherita Pizza → Size, Crust, Toppings modifiers
 * - Pepperoni Pizza → Size, Crust, Toppings modifiers (same modifiers, different item)
 */
@Entity('menu_item_modifiers')
@Unique(['menuItemId', 'modifierId'])
@Index(['menuItemId', 'isActive'])
export class MenuItemModifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @Column({ name: 'modifier_id' })
  modifierId: string;

  @ManyToOne(() => Modifier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_id' })
  modifier: Modifier;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number; // Order in which modifiers appear for this item

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
