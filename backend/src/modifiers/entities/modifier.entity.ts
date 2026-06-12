import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Business } from '../../setup-business/entities/business.entity';
import { ModifierOption } from './modifier-option.entity';

/**
 * Modifier Entity (Enhanced)
 *
 * Defines a modifier group (e.g., "Size", "Toppings", "Milk Choice")
 * Contains multiple ModifierOption entities for individual choices
 */
@Entity('modifiers')
@Index(['businessId', 'status'])
export class Modifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // 'Size', 'Toppings', 'Milk Choice', 'Crust Type'

  @Column({ name: 'modifier_type' })
  modifierType: 'single_select' | 'multi_select' | 'quantity' | 'text_input';

  @Column({ name: 'is_required', default: false })
  isRequired: boolean; // Must be selected (e.g., Pizza Size)

  @Column({ name: 'min_selections', type: 'int', default: 0 })
  minSelections: number; // For multi-select modifiers

  @Column({ name: 'max_selections', type: 'int', nullable: true })
  maxSelections: number | null; // null = unlimited

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null; // Help text for customers

  @Column({ name: 'icon', type: 'varchar', nullable: true })
  icon: string | null; // Emoji or icon identifier

  @Column({ default: 'active' })
  status: string; // 'active', 'inactive', 'archived'

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => ModifierOption, (option) => option.modifier, {
    cascade: true,
  })
  options: ModifierOption[];

  // Source tracking
  @Column({ name: 'source', type: 'varchar', default: 'manual' })
  source: 'manual' | 'ai_generated' | 'template'; // How this modifier was created

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null; // Reference to ModifierTemplate if created from template

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
