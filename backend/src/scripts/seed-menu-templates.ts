#!/usr/bin/env ts-node

/**
 * Seed Menu Templates Script
 *
 * This script seeds the database with pre-built menu templates
 * from Universal-Menu.json to enable Tier 1 caching (0 tokens).
 *
 * Usage:
 *   npm run seed:menu-templates
 *
 * Or directly:
 *   npx ts-node backend/src/scripts/seed-menu-templates.ts
 */

import { DataSource } from 'typeorm';
import { MenuTemplate } from '../menus/entities/menu-template.entity';
import { seedMenuTemplates } from '../ai-integration/seeds/menu-templates.seed';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🌱 Starting menu templates seed...\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'dive_pos',
    entities: [MenuTemplate],
    synchronize: false, // Don't auto-sync in production
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const templateRepo = dataSource.getRepository(MenuTemplate);

    // Check if templates already exist
    const existingCount = await templateRepo.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing templates`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        readline.question(
          'Do you want to clear and re-seed? (yes/no): ',
          resolve,
        );
      });
      readline.close();

      if (answer.toLowerCase() === 'yes') {
        await templateRepo.clear();
        console.log('🗑️  Cleared existing templates\n');
      } else {
        console.log('❌ Seed cancelled');
        await dataSource.destroy();
        process.exit(0);
      }
    }

    // Run seed
    await seedMenuTemplates(templateRepo);

    // Verify
    const finalCount = await templateRepo.count();
    console.log(`\n✅ Seed complete! Total templates: ${finalCount}`);

    // Show template summary
    const templates = await templateRepo.find({
      select: [
        'id',
        'templateName',
        'businessType',
        'cuisineType',
        'dietaryCategory',
        'confidenceScore',
      ],
      order: { templateName: 'ASC' },
    });

    console.log('\n📋 Seeded Templates:');
    console.log('─'.repeat(80));
    templates.forEach((t, i) => {
      console.log(`${i + 1}. ${t.templateName}`);
      console.log(
        `   Type: ${t.businessType} | Cuisine: ${t.cuisineType || 'N/A'} | Dietary: ${t.dietaryCategory || 'N/A'} | Confidence: ${t.confidenceScore}`,
      );
    });
    console.log('─'.repeat(80));

    await dataSource.destroy();
    console.log('\n🎉 Done!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

main();
