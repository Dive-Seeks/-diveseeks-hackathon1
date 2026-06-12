import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TemplateSeederService } from '../menus/services/template-seeder.service';

/**
 * CLI Command: Seed Modifier Templates
 *
 * Usage: npx ts-node backend/src/cli/seed-templates.command.ts
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seeder = app.get(TemplateSeederService);
    console.log('🌱 Starting template seeding...\n');

    await seeder.seedTemplates();

    console.log('\n✅ Template seeding completed successfully!');
  } catch (error) {
    console.error('❌ Template seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
