import { Injectable, Logger } from '@nestjs/common';
import { MenuEmbeddingsService } from './menu-embeddings.service';
import * as path from 'path';
import * as fs from 'fs';

export interface SeedResult {
  seeded: number;
  skipped: number;
  errors: number;
}

interface MenuItem {
  id?: string;
  name?: string;
  description?: string;
  dietary?: string;
  dietary_status?: string;
  base_price?: number;
  price?: number;
}

interface MenuCategory {
  name?: string;
  items?: MenuItem[];
}

interface MenuRestaurant {
  id?: string;
  slug?: string;
  name?: string;
  cuisine?: string;
  categories?: MenuCategory[];
}

interface MainCategory {
  id?: string;
  name?: string;
  cuisine_type?: string;
  country?: string;
  region?: string;
  type?: string;
}

interface ModifierOption {
  name?: string;
}

interface ModifierBlueprint {
  id?: string;
  name?: string;
  multi_select?: boolean;
  options?: ModifierOption[];
}

type DishData = {
  tenantId: null;
  sourceType: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class MenuEmbeddingsSeeder {
  private readonly logger = new Logger(MenuEmbeddingsSeeder.name);
  private readonly MENUS_DIR = path.join(process.cwd(), '../docs/Menus');

  constructor(private readonly service: MenuEmbeddingsService) {}

  async seedIfNeeded(): Promise<SeedResult> {
    const existingDishes = await this.service.countEmbeddings('dish');
    const existingModifiers =
      await this.service.countEmbeddings('modifier_blueprint');

    if (existingDishes >= 100 && existingModifiers > 0) {
      this.logger.log(
        `Skipping seed — ${existingDishes} dish embeddings and ${existingModifiers} modifier blueprints already exist`,
      );
      return {
        seeded: 0,
        skipped: existingDishes + existingModifiers,
        errors: 0,
      };
    }
    return this.seed();
  }

  async seed(): Promise<SeedResult> {
    const result: SeedResult = { seeded: 0, skipped: 0, errors: 0 };
    const dishes = this.collectDishes();

    this.logger.log(`Seeding ${dishes.length} dishes into menu_embeddings...`);

    // Embed in batches of 20 to stay within rate limits
    const BATCH = 20;
    for (let i = 0; i < dishes.length; i += BATCH) {
      const batch = dishes.slice(i, i + BATCH);
      try {
        const texts = batch.map((d) => d.content);
        const embeddings = await this.service.embedBatch(texts);
        for (let j = 0; j < batch.length; j++) {
          try {
            await this.service.upsertEmbedding({
              ...batch[j],
              embedding: embeddings[j],
            });
            result.seeded++;
          } catch (err) {
            this.logger.warn(
              `Failed to upsert ${batch[j].sourceId}: ${(err as Error).message}`,
            );
            result.errors++;
          }
        }
        this.logger.log(
          `Seeded batch ${Math.floor(i / BATCH) + 1} / ${Math.ceil(dishes.length / BATCH)}`,
        );
      } catch (err) {
        this.logger.error(
          `Batch embed failed at offset ${i}: ${(err as Error).message}`,
        );
        result.errors += batch.length;
      }
    }

    this.logger.log(
      `Seed complete: ${result.seeded} seeded, ${result.skipped} skipped, ${result.errors} errors`,
    );
    return result;
  }

  private collectDishes(): DishData[] {
    const dishes: DishData[] = [];

    // 1. menus.json — real restaurant chains
    this.collectFromMenusFile('menus.json', dishes);

    // 2. cafes1.json + cafes2.json
    this.collectFromMenusFile('cafes1.json', dishes);
    this.collectFromMenusFile('cafes2.json', dishes);

    // 3. main-categories.json — cuisine category templates
    this.collectFromCategoriesFile(dishes);

    // 4. Universal-Menu.json - modifier blueprints
    this.collectFromUniversalMenuFile(dishes);

    return dishes;
  }

  private collectFromMenusFile(filename: string, out: DishData[]): void {
    const filePath = path.join(this.MENUS_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return;
    }

    const dataRecord = data as { restaurants?: MenuRestaurant[] };
    const restaurants: MenuRestaurant[] = Array.isArray(data)
      ? (data as MenuRestaurant[])
      : (dataRecord.restaurants ?? []);

    for (const restaurant of restaurants) {
      const cuisine = restaurant.cuisine ?? 'General';
      for (const category of restaurant.categories ?? []) {
        for (const item of category.items ?? []) {
          if (!item.name) continue;

          const content = [
            item.name,
            cuisine,
            category.name ?? '',
            item.description ?? '',
          ]
            .filter(Boolean)
            .join(' — ');

          const restaurantId =
            restaurant.id ?? restaurant.slug ?? 'unknown-restaurant';
          const itemId =
            item.id ?? item.name.toLowerCase().replace(/\s+/g, '-');

          out.push({
            tenantId: null,
            sourceType: 'dish',
            sourceId: `${restaurantId}-${itemId}`,
            content,
            metadata: {
              restaurant: restaurant.name ?? 'Unknown',
              cuisine,
              category: category.name ?? 'Unknown',
              dietary: item.dietary ?? item.dietary_status ?? null,
              price: item.base_price ?? item.price ?? null,
            },
          });
        }
      }
    }
  }

  private collectFromCategoriesFile(out: DishData[]): void {
    const filePath = path.join(this.MENUS_DIR, 'main-categories.json');
    if (!fs.existsSync(filePath)) return;

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return;
    }

    const items: MainCategory[] = Array.isArray(data)
      ? (data as MainCategory[])
      : (Object.values(data as Record<string, unknown>) as MainCategory[]);

    for (const item of items) {
      if (!item.name) continue;
      const content = [
        item.name,
        item.cuisine_type ?? '',
        item.country ?? '',
        item.region ?? '',
        item.type ?? '',
      ]
        .filter(Boolean)
        .join(' — ');

      const categoryId =
        item.id ?? item.name.toLowerCase().replace(/\s+/g, '-');

      out.push({
        tenantId: null,
        sourceType: 'category',
        sourceId: `cat-${categoryId}`,
        content,
        metadata: {
          cuisine: item.cuisine_type ?? null,
          country: item.country ?? null,
          region: item.region ?? null,
          type: item.type ?? null,
        },
      });
    }
  }

  private collectFromUniversalMenuFile(out: DishData[]): void {
    const filePath = path.join(this.MENUS_DIR, 'Universal-Menu.json');
    if (!fs.existsSync(filePath)) return;

    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return;
    }

    const dataRecord = data as {
      modifier_blueprints?: Record<string, Record<string, ModifierBlueprint>>;
    };
    const blueprints = dataRecord.modifier_blueprints;
    if (!blueprints) return;

    for (const [logicKey, logicGroup] of Object.entries(blueprints)) {
      for (const [modifierKey, modifier] of Object.entries(logicGroup)) {
        if (!modifier.id || !modifier.name) continue;

        const options = (modifier.options ?? [])
          .map((opt) => opt.name ?? '')
          .filter(Boolean)
          .join(', ');
        const content = `${modifier.name} options: ${options} (Logic: ${logicKey})`;

        out.push({
          tenantId: null,
          sourceType: 'modifier_blueprint',
          sourceId: modifier.id,
          content,
          metadata: {
            logicGroup: logicKey,
            modifierKey,
            name: modifier.name,
            multiSelect: !!modifier.multi_select,
            optionsCount: (modifier.options ?? []).length,
          },
        });
      }
    }
  }
}
