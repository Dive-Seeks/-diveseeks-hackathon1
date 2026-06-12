import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductModifierCategoryTemplates1744619741000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ CREATE product_templates TABLE ============
    await queryRunner.query(`
      CREATE TABLE product_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        business_type VARCHAR(50) NOT NULL,
        cuisine_type VARCHAR(100),
        category_slug VARCHAR(100) NOT NULL,
        category_display_name VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        base_price INTEGER NOT NULL,
        suggested_price_range JSONB,
        dietary_status VARCHAR(50) NOT NULL,
        allergens JSONB DEFAULT '[]'::jsonb,
        contains_alcohol BOOLEAN DEFAULT false,
        contains_pork BOOLEAN DEFAULT false,
        is_gluten_free BOOLEAN DEFAULT false,
        size_options JSONB,
        required_modifiers JSONB DEFAULT '[]'::jsonb,
        optional_modifiers JSONB DEFAULT '[]'::jsonb,
        tags JSONB DEFAULT '[]'::jsonb,
        calories INTEGER,
        prep_time_minutes INTEGER,
        image_prompt TEXT,
        usage_count INTEGER DEFAULT 0,
        success_score DECIMAL(3,2) DEFAULT 0.85,
        confidence_score DECIMAL(3,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT true,
        is_seasonal BOOLEAN DEFAULT false,
        season_months JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for product_templates
    await queryRunner.query(`
      CREATE INDEX idx_product_template_business_category
        ON product_templates(business_type, category_slug, is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_product_template_dietary
        ON product_templates(dietary_status, is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_product_template_usage
        ON product_templates(usage_count DESC, success_score DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_product_template_cuisine
        ON product_templates(cuisine_type, is_active);
    `);

    // ============ CREATE modifier_templates TABLE ============
    await queryRunner.query(`
      CREATE TABLE modifier_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        modifier_slug VARCHAR(100) UNIQUE NOT NULL,
        modifier_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(50) NOT NULL,
        category_slug VARCHAR(100),
        is_universal BOOLEAN DEFAULT false,
        modifier_type VARCHAR(50) NOT NULL,
        is_required BOOLEAN DEFAULT false,
        min_selections INTEGER DEFAULT 0,
        max_selections INTEGER,
        display_order INTEGER DEFAULT 0,
        options JSONB NOT NULL,
        dietary_replacements JSONB,
        conditional_display JSONB,
        description TEXT,
        icon VARCHAR(50),
        tags JSONB DEFAULT '[]'::jsonb,
        usage_count INTEGER DEFAULT 0,
        confidence_score DECIMAL(3,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for modifier_templates
    await queryRunner.query(`
      CREATE INDEX idx_modifier_template_slug
        ON modifier_templates(modifier_slug);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_modifier_template_business
        ON modifier_templates(business_type, category_slug, is_active);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_modifier_template_universal
        ON modifier_templates(is_universal, is_active);
    `);

    // ============ CREATE item_category_templates TABLE ============
    await queryRunner.query(`
      CREATE TABLE item_category_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_slug VARCHAR(100) NOT NULL,
        category_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(50) NOT NULL,
        cuisine_type VARCHAR(100),
        is_universal BOOLEAN DEFAULT false,
        description TEXT,
        icon VARCHAR(50),
        display_order INTEGER DEFAULT 0,
        is_default BOOLEAN DEFAULT false,
        requires_age_verification BOOLEAN DEFAULT false,
        is_time_restricted BOOLEAN DEFAULT false,
        available_time_slots JSONB,
        tags JSONB DEFAULT '[]'::jsonb,
        suggested_product_count JSONB,
        typical_products JSONB DEFAULT '[]'::jsonb,
        ai_generation_hints JSONB,
        usage_count INTEGER DEFAULT 0,
        confidence_score DECIMAL(3,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT true,
        is_seasonal BOOLEAN DEFAULT false,
        season_months JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Indexes for item_category_templates
    await queryRunner.query(`
      CREATE INDEX idx_category_template_business
        ON item_category_templates(business_type, is_active, display_order);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_category_template_slug
        ON item_category_templates(category_slug, business_type);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_category_template_universal
        ON item_category_templates(is_universal, is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS item_category_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS modifier_templates;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_templates;`);
  }
}
