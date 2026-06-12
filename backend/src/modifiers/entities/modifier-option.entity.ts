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
import { Modifier } from './modifier.entity';

/**
 * ModifierOption Entity
 *
 * Individual options within a modifier (e.g., "Small", "Medium", "Large" for Size modifier)
 * Supports store-specific pricing for multi-tenant scenarios
 */
@Entity('modifier_options')
@Index(['modifierId', 'isActive'])
export class ModifierOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'modifier_id' })
  modifierId: string;

  @ManyToOne(() => Modifier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_id' })
  modifier: Modifier;

  @Column({ name: 'name' })
  name: string; // 'Small', 'Medium', 'Large', 'Oat Milk', 'Extra Cheese', etc.

  @Column({ name: 'price_modifier', type: 'int', default: 0 })
  priceModifier: number; // Default price modifier in cents (can be overridden per store)

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean; // Auto-selected by default

  // Optional metadata
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'calories', type: 'int', nullable: true })
  calories: number | null;

  @Column({ name: 'allergens', type: 'jsonb', nullable: true })
  allergens: string[] | null; // ['dairy', 'nuts', 'gluten']

  @Column({ name: 'dietary_status', type: 'varchar', nullable: true })
  dietaryStatus: 'halal' | 'non_halal' | 'vegetarian' | 'vegan' | null;

  @Column({ name: 'contains_alcohol', default: false })
  containsAlcohol: boolean;

  @Column({ name: 'contains_pork', default: false })
  containsPork: boolean;

  @Column({ name: 'icon', type: 'varchar', nullable: true })
  icon: string | null; // Emoji or icon identifier

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
