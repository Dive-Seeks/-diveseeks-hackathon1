/**
 * Cached loaders for docs/Menus reference JSON files.
 * Used by AI wizard routes to inject real-world menu data into prompts.
 */
import * as fs from 'fs/promises';
import * as path from 'path';

// ============ Types ============

export interface MainCategoryDish {
  id: number;
  country: string;
  cuisine_type: string;
  name: string;
  region: string;
  type: string; // "Dessert" | "Non-Vegetarian" | "Vegetarian" | "Beverage"
}

export interface ModifierBlueprint {
  id: string;
  name: string;
  multi_select?: boolean;
  options: Array<{
    name: string;
    dietary_status: string;
    priceModifier?: number;
  }>;
}

export interface ItemTemplate {
  name: string;
  base_price: number;
  dietary_status: string;
  description?: string;
  required_modifiers?: string[];
  categories?: string[];
  contains_alcohol?: boolean;
}

export interface DietaryReplacementRule {
  trigger: string;
  target: string;
  suggestion: string;
  type: string;
}

export interface UniversalMenuData {
  modifier_blueprints: Record<string, Record<string, ModifierBlueprint>>;
  item_templates: Record<string, ItemTemplate[]>;
  dietary_replacement_rules: DietaryReplacementRule[];
  main_categories: MainCategoryDish[];
}

export interface GlobalAttributeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export interface GlobalAttributeGroup {
  label: string;
  options: GlobalAttributeOption[];
}

export interface GlobalAttributesData {
  menu_global_attributes: Record<string, GlobalAttributeGroup>;
}

// ============ In-memory Cache ============

let mainCategoriesCache: MainCategoryDish[] | null = null;
let universalMenuCache: UniversalMenuData | null = null;
let globalAttributesCache: GlobalAttributesData | null = null;

function resolveDocsPath(filename: string): string {
  // Scoped to docs/Menus subfolder — turbopackIgnore prevents whole-project tracing
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'docs', 'Menus', filename);
}

// ============ Loaders ============

export async function getMainCategories(): Promise<MainCategoryDish[]> {
  if (mainCategoriesCache) return mainCategoriesCache;
  try {
    const filePath = resolveDocsPath('main-categories.json');
    const raw = await fs.readFile(filePath, 'utf8');
    mainCategoriesCache = JSON.parse(raw) as MainCategoryDish[];
    return mainCategoriesCache;
  } catch (err) {
    console.warn('[MenuRefData] Failed to load main-categories.json:', err);
    return [];
  }
}

export async function getUniversalMenu(): Promise<UniversalMenuData | null> {
  if (universalMenuCache) return universalMenuCache;
  try {
    const filePath = resolveDocsPath('Universal-Menu.json');
    const raw = await fs.readFile(filePath, 'utf8');
    universalMenuCache = JSON.parse(raw) as UniversalMenuData;
    return universalMenuCache;
  } catch (err) {
    console.warn('[MenuRefData] Failed to load Universal-Menu.json:', err);
    return null;
  }
}

export async function getGlobalAttributes(): Promise<GlobalAttributesData | null> {
  if (globalAttributesCache) return globalAttributesCache;
  try {
    const filePath = resolveDocsPath('menu_global_attributes.json');
    const raw = await fs.readFile(filePath, 'utf8');
    globalAttributesCache = JSON.parse(raw) as GlobalAttributesData;
    return globalAttributesCache;
  } catch (err) {
    console.warn('[MenuRefData] Failed to load menu_global_attributes.json:', err);
    return null;
  }
}

// ============ Query Helpers ============

/** Get all unique cuisine types available in the reference data */
export async function getAvailableCuisines(): Promise<string[]> {
  const dishes = await getMainCategories();
  return [...new Set(dishes.map(d => d.cuisine_type))].sort();
}

/** Get dishes filtered by cuisine type(s) */
export async function getDishesByCuisine(cuisines: string[]): Promise<MainCategoryDish[]> {
  const dishes = await getMainCategories();
  const lowerCuisines = cuisines.map(c => c.toLowerCase());
  return dishes.filter(d => lowerCuisines.includes(d.cuisine_type.toLowerCase()));
}

/** Get dishes grouped by their type (Dessert, Non-Vegetarian, etc.) */
export async function getDishesGroupedByType(
  cuisines: string[],
): Promise<Record<string, string[]>> {
  const filtered = await getDishesByCuisine(cuisines);
  const grouped: Record<string, string[]> = {};
  for (const d of filtered) {
    if (!grouped[d.type]) grouped[d.type] = [];
    grouped[d.type].push(d.name);
  }
  return grouped;
}

/** Get modifier blueprints relevant to a business type */
export async function getRelevantModifierBlueprints(
  businessType: string,
  keywords: string[],
): Promise<Record<string, ModifierBlueprint>> {
  const um = await getUniversalMenu();
  if (!um) return {};

  const relevant: Record<string, ModifierBlueprint> = {};
  const lowerKw = keywords.map(k => k.toLowerCase());
  const lowerBt = businessType.toLowerCase();

  // Map business keywords to blueprint sections
  const blueprintMap: Record<string, string[]> = {
    pizza_logic: ['pizza', 'italian'],
    subway_logic: ['sandwich', 'sub', 'wrap'],
    cafe_logic: ['cafe', 'coffee', 'tea', 'bakery'],
    bar_logic: ['bar', 'pub', 'cocktail', 'mocktail'],
  };

  for (const [logicKey, triggers] of Object.entries(blueprintMap)) {
    const matches = triggers.some(
      t => lowerKw.includes(t) || lowerBt.includes(t),
    );
    if (matches && um.modifier_blueprints[logicKey]) {
      for (const [subKey, blueprint] of Object.entries(um.modifier_blueprints[logicKey])) {
        relevant[`${logicKey}.${subKey}`] = blueprint as ModifierBlueprint;
      }
    }
  }

  return relevant;
}

/** Get item templates relevant to detected keywords */
export async function getRelevantItemTemplates(
  keywords: string[],
): Promise<ItemTemplate[]> {
  const um = await getUniversalMenu();
  if (!um) return [];

  const lowerKw = keywords.map(k => k.toLowerCase());
  const results: ItemTemplate[] = [];

  const sectorMap: Record<string, string[]> = {
    pizza_sector: ['pizza', 'italian'],
    chicken_sector: ['chicken', 'fried chicken', 'wings'],
    sandwich_sector: ['sandwich', 'sub', 'wrap'],
    bar_sector: ['bar', 'cocktail', 'mocktail', 'drinks'],
  };

  for (const [sectorKey, triggers] of Object.entries(sectorMap)) {
    if (triggers.some(t => lowerKw.includes(t))) {
      const templates = um.item_templates[sectorKey] || [];
      results.push(...templates);
    }
  }

  return results;
}

/** Get dietary replacement rules */
export async function getDietaryReplacementRules(): Promise<DietaryReplacementRule[]> {
  const um = await getUniversalMenu();
  return um?.dietary_replacement_rules || [];
}

/** Get valid attribute options for a specific attribute key */
export async function getAttributeOptions(
  attributeKey: string,
): Promise<GlobalAttributeOption[]> {
  const attrs = await getGlobalAttributes();
  if (!attrs) return [];
  const group = attrs.menu_global_attributes[attributeKey];
  return group?.options || [];
}
