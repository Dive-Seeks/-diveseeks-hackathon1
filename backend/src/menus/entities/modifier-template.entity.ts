import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ModifierTemplate Entity
 *
 * Reusable modifier blueprints for AI menu generation.
 * Modifiers allow customers to customize products (sizes, toppings, add-ons, etc.)
 *
 * Examples:
 * - Pizza: Sizes (Small/Medium/Large), Crusts (Thin/Hand-Tossed/Gluten-Free), Toppings
 * - Coffee: Milk Options (Whole/Skim/Oat/Almond), Espresso Shots, Flavor Syrups
 * - Sandwiches: Bread Type, Protein Choice, Cheese, Toppings
 * - Cocktails: Spirit Choice, Mixers, Garnish
 */
@Entity('modifier_templates')
@Index(['businessType', 'modifierSlug', 'isActive'])
@Index(['categorySlug', 'isUniversal'])
export class ModifierTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============ CLASSIFICATION ============
  @Column({ name: 'modifier_slug', unique: true })
  modifierSlug: string; // 'mod_pizza_size', 'mod_milk_choice', 'mod_protein_choice'

  @Column({ name: 'modifier_name' })
  modifierName: string; // 'Size', 'Milk Choice', 'Protein', 'Toppings'

  @Column({ name: 'business_type' })
  businessType:
    | 'RESTAURANT'
    | 'RETAIL'
    | 'CAFE'
    | 'BAR'
    | 'HYBRID'
    | 'UNIVERSAL';

  @Column({ name: 'category_slug', type: 'varchar', nullable: true })
  categorySlug: string | null; // 'pizza', 'coffee', 'sandwich', 'cocktails' (null if universal)

  @Column({ name: 'is_universal', default: false })
  isUniversal: boolean; // True for modifiers applicable across categories (e.g., 'Extra Sauce', 'Spice Level')

  // ============ MODIFIER BEHAVIOR ============
  @Column({ name: 'modifier_type' })
  modifierType: 'single_select' | 'multi_select' | 'quantity' | 'text_input';

  @Column({ name: 'is_required', default: false })
  isRequired: boolean; // Must be selected (e.g., Pizza Size)

  @Column({ name: 'min_selections', type: 'int', default: 0 })
  minSelections: number; // Minimum number of selections (for multi-select)

  @Column({ name: 'max_selections', type: 'int', nullable: true })
  maxSelections: number | null; // Maximum selections (null = unlimited)

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number; // Order in which modifiers appear in UI

  // ============ OPTIONS ============
  @Column({ name: 'options', type: 'jsonb' })
  options: Array<{
    name: string; // 'Small', 'Oat Milk', 'Turkey Bacon', 'Extra Cheese'
    priceModifier: number; // In cents (+0, +75, +200, etc.)
    dietaryStatus?: 'halal' | 'non_halal' | 'vegetarian' | 'vegan'; // For dietary filtering
    isDefault?: boolean; // Default selection
    calories?: number; // Nutritional impact
    allergens?: string[]; // ['dairy', 'nuts']
    containsAlcohol?: boolean;
    containsPork?: boolean;
    description?: string; // Optional description
  }>;

  // ============ DIETARY REPLACEMENT LOGIC ============
  @Column({ name: 'dietary_replacements', type: 'jsonb', nullable: true })
  dietaryReplacements: Array<{
    trigger: 'halal' | 'vegetarian' | 'vegan' | 'kosher' | 'gluten_free';
    originalOption: string; // 'Pork Bacon'
    replacementOption: string; // 'Turkey Bacon'
    autoApply: boolean; // Automatically replace or suggest?
  }> | null;

  // ============ CONDITIONAL LOGIC ============
  @Column({ name: 'conditional_display', type: 'jsonb', nullable: true })
  conditionalDisplay: {
    showWhen?: {
      productTags?: string[]; // Show only for products with these tags
      dietaryStatus?: string[]; // Show only for halal/vegan/etc. products
      categorySlug?: string[]; // Show only for specific categories
    };
    hideWhen?: {
      productTags?: string[];
      dietaryStatus?: string[];
    };
  } | null;

  // ============ METADATA ============
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null; // Help text shown to customers

  @Column({ name: 'icon', type: 'varchar', nullable: true })
  icon: string | null; // Emoji or icon identifier ('☕', '🌶️', '🥛')

  @Column({ name: 'tags', type: 'jsonb', default: [] })
  tags: string[]; // ['popular', 'dietary', 'customization', 'premium']

  // ============ AI USAGE ============
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number; // Tracking for AI optimization

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
  })
  confidenceScore: number; // 1.0 = human-curated, <1.0 = AI-generated

  // ============ STATUS ============
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // ============ TIMESTAMPS ============
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
