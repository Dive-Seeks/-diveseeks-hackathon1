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
import { ModifierOption } from './modifier-option.entity';
import { Store } from '../../setup-business/entities/store.entity';

/**
 * ModifierOptionPricing Entity
 *
 * Store-specific pricing overrides for modifier options
 * Allows same modifier to have different prices at different locations
 *
 * Example:
 * - London store: Large Pizza +£3.00
 * - Manchester store: Large Pizza +£2.50
 */
@Entity('modifier_option_pricing')
@Unique(['modifierOptionId', 'storeId'])
@Index(['modifierOptionId', 'storeId'])
export class ModifierOptionPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'modifier_option_id' })
  modifierOptionId: string;

  @ManyToOne(() => ModifierOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modifier_option_id' })
  modifierOption: ModifierOption;

  @Column({ name: 'store_id' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'price_modifier', type: 'int' })
  priceModifier: number; // Price override in cents for this store

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
