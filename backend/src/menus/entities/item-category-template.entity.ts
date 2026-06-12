import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ItemCategoryTemplate Entity
 *
 * Reusable category blueprints for organizing menu items.
 * Categories help structure menus logically and improve customer experience.
 *
 * Examples:
 * - Restaurant: Appetizers, Main Courses, Desserts, Beverages
 * - Cafe: Specialty Coffee, Teas, Bakery, All-Day Brunch
 * - Bar: Signature Cocktails, Classic Cocktails, Beer & Wine, Bar Bites
 * - Pizza Shop: Pizza, Wings, Sides, Desserts
 */
@Entity('item_category_templates')
@Index(['businessType', 'categorySlug', 'isActive'])
@Index(['cuisineType', 'displayOrder'])
export class ItemCategoryTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ============ CLASSIFICATION ============
  @Column({ name: 'category_slug' })
  categorySlug: string; // 'appetizers', 'specialty-coffee', 'signature-cocktails', 'pizza'

  @Column({ name: 'category_name' })
  categoryName: string; // 'Appetizers', 'Specialty Coffee', 'Signature Cocktails', 'Pizza'

  @Column({ name: 'business_type' })
  businessType:
    | 'RESTAURANT'
    | 'RETAIL'
    | 'CAFE'
    | 'BAR'
    | 'HYBRID'
    | 'UNIVERSAL';

  @Column({ name: 'cuisine_type', type: 'varchar', nullable: true })
  cuisineType: string | null; // 'Italian', 'Mexican', 'American', null for universal categories

  @Column({ name: 'is_universal', default: false })
  isUniversal: boolean; // True for categories applicable across all business types (e.g., 'Beverages')

  // ============ DISPLAY & UI ============
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null; // 'Start your meal with these delicious bites.'

  @Column({ name: 'icon', type: 'varchar', nullable: true })
  icon: string | null; // Emoji or icon identifier ('🍕', '☕', '🍸', '🥗')

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number; // Order in which categories appear on menu (1, 2, 3...)

  @Column({ name: 'color_theme', type: 'varchar', nullable: true })
  colorTheme: string | null; // Hex color or theme name for UI styling

  // ============ CATEGORY BEHAVIOR ============
  @Column({ name: 'is_default', default: false })
  isDefault: boolean; // Should this category be auto-included in new menus?

  @Column({ name: 'requires_age_verification', default: false })
  requiresAgeVerification: boolean; // For alcohol, tobacco, etc.

  @Column({ name: 'is_time_restricted', default: false })
  isTimeRestricted: boolean; // True for breakfast-only, lunch-only, etc.

  @Column({ name: 'available_time_slots', type: 'jsonb', nullable: true })
  availableTimeSlots: Array<{
    day:
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday'
      | 'all';
    startTime: string; // '07:00'
    endTime: string; // '11:00'
  }> | null;

  // ============ METADATA ============
  @Column({ name: 'tags', type: 'jsonb', default: [] })
  tags: string[]; // ['popular', 'seasonal', 'limited-time', 'signature', 'family-style']

  @Column({ name: 'suggested_product_count', type: 'jsonb', nullable: true })
  suggestedProductCount: {
    min: number; // Minimum items recommended in this category
    max: number; // Maximum items recommended
    ideal: number; // Ideal number for a balanced menu
  } | null;

  @Column({ name: 'typical_products', type: 'jsonb', default: [] })
  typicalProducts: string[]; // Example product names that fit this category (for AI guidance)

  // ============ AI GUIDANCE ============
  @Column({ name: 'ai_generation_hints', type: 'jsonb', nullable: true })
  aiGenerationHints: {
    priceRange?: { min: number; max: number }; // Typical price range for this category (cents)
    portionSize?: 'small' | 'medium' | 'large' | 'shareable';
    prepComplexity?: 'simple' | 'moderate' | 'complex';
    keywords?: string[]; // Keywords AI should consider when generating items
    avoidKeywords?: string[]; // Keywords AI should avoid
  } | null;

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number; // How many times this category was used in AI generation

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
  seasonMonths: number[] | null; // [6, 7, 8] for Summer menu categories

  // ============ TIMESTAMPS ============
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
