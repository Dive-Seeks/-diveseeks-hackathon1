#!/usr/bin/env ts-node

/**
 * Seed Category and Product Templates
 *
 * This script seeds the database with category and product templates
 * needed for the AI Menu Wizard (Tier 1 caching).
 *
 * Usage:
 *   npx ts-node backend/src/database/seed-templates.ts
 */

import { DataSource } from 'typeorm';
import { ItemCategoryTemplate } from '../menus/entities/item-category-template.entity';
import { ProductTemplate } from '../menus/entities/product-template.entity';
import { ModifierTemplate } from '../menus/entities/modifier-template.entity';
import { seedCategoryTemplates } from '../menus/seeds/category-templates.seed';
import { seedProductTemplates } from '../menus/seeds/product-templates.seed';
import { seedModifierTemplates } from '../menus/seeds/modifier-templates.seed';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log(
    '🌱 Starting category, product, and modifier template seeding...\n',
  );

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'dive_pos',
    entities: [ItemCategoryTemplate, ProductTemplate, ModifierTemplate],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const categoryRepo = dataSource.getRepository(ItemCategoryTemplate);
    const productRepo = dataSource.getRepository(ProductTemplate);
    const modifierRepo = dataSource.getRepository(ModifierTemplate);

    // Seed categories
    console.log('📂 Seeding category templates...');
    const categoryCount = await categoryRepo.count();
    if (categoryCount === 0) {
      await seedCategoryTemplates(categoryRepo);
      console.log(
        `✅ Seeded ${await categoryRepo.count()} category templates\n`,
      );
    } else {
      console.log(
        `⚠️  ${categoryCount} category templates already exist. Skipping...\n`,
      );
    }

    // Seed products
    console.log('🍕 Seeding product templates...');
    const productCount = await productRepo.count();
    if (productCount === 0) {
      await seedProductTemplates(productRepo);
      console.log(`✅ Seeded ${await productRepo.count()} product templates\n`);
    } else {
      console.log(
        `⚠️  ${productCount} product templates already exist. Skipping...\n`,
      );
    }

    // Seed modifiers
    console.log('🎛️  Seeding modifier templates...');
    const modifierCount = await modifierRepo.count();
    if (modifierCount === 0) {
      await seedModifierTemplates(modifierRepo);
      console.log(
        `✅ Seeded ${await modifierRepo.count()} modifier templates\n`,
      );
    } else {
      console.log(
        `⚠️  ${modifierCount} modifier templates already exist. Skipping...\n`,
      );
    }

    // Summary
    console.log('\n📊 Final Counts:');
    console.log(`  Categories: ${await categoryRepo.count()}`);
    console.log(`  Products: ${await productRepo.count()}`);
    console.log(`  Modifiers: ${await modifierRepo.count()}`);

    await dataSource.destroy();
    console.log('\n🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
