import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ProductTemplate Entity
 *
 * Reusable product blueprints that AI uses to generate relevant menus.
 * These templates represent industry-standard products across different business types.
 *
 * Examples:
 * - Pizza templates (Halal Pepperoni, Margherita, Vegan Supreme)
 * - Sandwich templates (Turkey Sub, BLT, Veggie Wrap)
 * - Coffee templates (Latte, Cappuccino, Cold Brew)
 * - Bar templates (Mojito, Old Fashioned, Mocktails)
 */
@Entity('product_templates')
@Index(['businessType', 'categorySlug', 'dietaryStatus'])
@Index(['cuisineType', 'isActive'])
export class ProductTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============ CLASSIFICATION ============
  @Column({ name: 'business_type' })
  businessType: 'RESTAURANT' | 'RETAIL' | 'CAFE' | 'BAR' | 'HYBRID';

  @Column({ name: 'cuisine_type', type: 'varchar', nullable: true })
  cuisineType: string | null; // 'Italian', 'Mexican', 'Indian', 'American', 'Asian Fusion', etc.

  @Column({ name: 'category_slug' })
  categorySlug: string; // 'pizza', 'sandwich', 'coffee', 'cocktails', 'appetizers', 'desserts'

  @Column({ name: 'category_display_name' })
  categoryDisplayName: string; // 'Pizza', 'Sandwiches & Wraps', 'Specialty Coffee', etc.

  // ============ PRODUCT DETAILS ============
  @Column({ name: 'product_name' })
  productName: string; // 'Classic Margherita Pizza', 'Turkey & Swiss Sub', 'Vanilla Latte'

  @Column({ name: 'description', type: 'text' })
  description: string; // Detailed, appetizing description

  @Column({ name: 'base_price', type: 'int' })
  basePrice: number; // In cents (e.g., 1299 = $12.99)

  @Column({ name: 'suggested_price_range', type: 'jsonb', nullable: true })
  suggestedPriceRange: {
    min: number; // Cents
    max: number; // Cents
    market: 'budget' | 'mid-range' | 'premium' | 'luxury';
  } | null;

  // ============ DIETARY & COMPLIANCE ============
  @Column({ name: 'dietary_status' })
  dietaryStatus:
    | 'halal'
    | 'non_halal'
    | 'vegetarian'
    | 'vegan'
    | 'pescatarian'
    | 'kosher';

  @Column({ name: 'allergens', type: 'jsonb', default: [] })
  allergens: string[]; // ['gluten', 'dairy', 'nuts', 'shellfish', 'soy', 'eggs']

  @Column({ name: 'contains_alcohol', default: false })
  containsAlcohol: boolean;

  @Column({ name: 'contains_pork', default: false })
  containsPork: boolean;

  @Column({ name: 'is_gluten_free', default: false })
  isGlutenFree: boolean;

  // ============ MODIFIERS & OPTIONS ============
  @Column({ name: 'size_options', type: 'jsonb', nullable: true })
  sizeOptions: Array<{
    name: string; // 'Small', 'Medium', 'Large', '12oz', '16oz'
    priceModifier: number; // In cents (+0, +200, +400)
    description?: string;
  }> | null;

  @Column({ name: 'required_modifiers', type: 'jsonb', default: [] })
  requiredModifiers: string[]; // ['mod_pizza_size', 'mod_pizza_crust']

  @Column({ name: 'optional_modifiers', type: 'jsonb', default: [] })
  optionalModifiers: string[]; // ['mod_pizza_toppings', 'mod_extra_cheese']

  // ============ METADATA ============
  @Column({ name: 'tags', type: 'jsonb', default: [] })
  tags: string[]; // ['popular', 'new', 'seasonal', 'signature', 'spicy', 'kid-friendly']

  @Column({ name: 'calories', type: 'int', nullable: true })
  calories: number | null; // Nutritional info (optional)

  @Column({ name: 'prep_time_minutes', type: 'int', nullable: true })
  prepTimeMinutes: number | null; // Estimated preparation time

  @Column({ name: 'image_prompt', type: 'text', nullable: true })
  imagePrompt: string | null; // AI image generation prompt for future use

  // ============ AI USAGE ============
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number; // How many times this template was used in AI generation

  @Column({
    name: 'success_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0.85,
  })
  successScore: number; // 0.0 - 1.0, based on user acceptance rate

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

  @Column({ name: 'is_seasonal', default: false })
  isSeasonal: boolean;

  @Column({ name: 'season_months', type: 'jsonb', nullable: true })
  seasonMonths: number[] | null; // [10, 11, 12] for Oct-Dec (Pumpkin Spice season)

  // ============ TIMESTAMPS ============
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
