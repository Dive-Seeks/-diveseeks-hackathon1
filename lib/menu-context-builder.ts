/**
 * Builds condensed context strings from docs/Menus reference data
 * for injection into AI system prompts. Ensures prompts stay within
 * reasonable token limits while including the most relevant data.
 */
import {
  getDishesByCuisine,
  getDishesGroupedByType,
  getRelevantModifierBlueprints,
  getRelevantItemTemplates,
  getDietaryReplacementRules,
  getAvailableCuisines,
  getGlobalAttributes,
  type MainCategoryDish,
} from './menu-reference-data';

// ============ Cuisine → Category Map ============

const CUISINE_CATEGORIES: Record<string, Array<{ slug: string; name: string; icon: string; desc: string; count: number }>> = {
  Indian: [
    { slug: 'tandoori-grills', name: 'Tandoori & Grills', icon: '🔥', desc: 'Tandoori chicken, seekh kebabs, tikka', count: 8 },
    { slug: 'curries', name: 'Curries', icon: '🍛', desc: 'Rich curry dishes with aromatic spices', count: 12 },
    { slug: 'biryani-rice', name: 'Biryani & Rice', icon: '🍚', desc: 'Fragrant rice dishes and biryanis', count: 6 },
    { slug: 'breads', name: 'Breads & Naan', icon: '🫓', desc: 'Naan, roti, paratha, puri', count: 6 },
    { slug: 'starters', name: 'Starters', icon: '🥗', desc: 'Samosas, pakoras, chaat', count: 8 },
    { slug: 'sides', name: 'Sides & Raita', icon: '🥒', desc: 'Raita, salad, pickles, chutneys', count: 5 },
    { slug: 'desserts', name: 'Desserts', icon: '🍮', desc: 'Gulab jamun, kheer, kulfi', count: 5 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Lassi, chai, soft drinks', count: 6 },
  ],
  Pakistani: [
    { slug: 'karahi', name: 'Karahi', icon: '🍳', desc: 'Chicken, lamb & prawn karahi', count: 6 },
    { slug: 'curries', name: 'Curries & Salan', icon: '🍛', desc: 'Nihari, haleem, korma', count: 10 },
    { slug: 'bbq-grills', name: 'BBQ & Grills', icon: '🔥', desc: 'Seekh kebab, chapli kebab, tikka', count: 8 },
    { slug: 'biryani-rice', name: 'Biryani & Rice', icon: '🍚', desc: 'Biryani, pulao, fried rice', count: 6 },
    { slug: 'breads', name: 'Breads', icon: '🫓', desc: 'Naan, tandoori roti, paratha', count: 6 },
    { slug: 'starters', name: 'Starters', icon: '🥗', desc: 'Samosa, pakora, rolls', count: 6 },
    { slug: 'desserts', name: 'Desserts', icon: '🍮', desc: 'Kheer, jalebi, gajar halwa', count: 5 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Lassi, doodh patti, rooh afza', count: 5 },
  ],
  Chinese: [
    { slug: 'starters', name: 'Starters', icon: '🥟', desc: 'Dumplings, spring rolls, prawn toast', count: 8 },
    { slug: 'soups', name: 'Soups', icon: '🥣', desc: 'Hot & sour, wonton, sweetcorn', count: 5 },
    { slug: 'mains', name: 'Main Courses', icon: '🍜', desc: 'Stir fry, sweet & sour, kung pao', count: 12 },
    { slug: 'noodles-rice', name: 'Noodles & Rice', icon: '🍝', desc: 'Chow mein, fried rice, lo mein', count: 8 },
    { slug: 'duck', name: 'Duck Dishes', icon: '🦆', desc: 'Crispy duck, Peking duck', count: 4 },
    { slug: 'sides', name: 'Sides', icon: '🥡', desc: 'Prawn crackers, chips, salad', count: 4 },
    { slug: 'desserts', name: 'Desserts', icon: '🍮', desc: 'Banana fritters, ice cream', count: 3 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Bubble tea, Chinese tea, soft drinks', count: 5 },
  ],
  Turkish: [
    { slug: 'kebabs', name: 'Kebabs', icon: '🥙', desc: 'Doner, shish, adana, iskender', count: 8 },
    { slug: 'grills', name: 'Grills & Meze', icon: '🔥', desc: 'Mixed grills, kofte, chicken wings', count: 6 },
    { slug: 'wraps-pide', name: 'Wraps & Pide', icon: '🫓', desc: 'Turkish wraps, lahmacun, pide', count: 6 },
    { slug: 'salads', name: 'Salads & Meze', icon: '🥗', desc: 'Hummus, falafel, fattoush', count: 6 },
    { slug: 'sides', name: 'Sides', icon: '🍟', desc: 'Fries, rice, bread, coleslaw', count: 5 },
    { slug: 'desserts', name: 'Desserts', icon: '🍯', desc: 'Baklava, kunefe, Turkish delight', count: 4 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Ayran, Turkish tea, soft drinks', count: 5 },
  ],
  Italian: [
    { slug: 'pizza', name: 'Pizza', icon: '🍕', desc: 'Classic and gourmet pizzas', count: 12 },
    { slug: 'pasta', name: 'Pasta', icon: '🍝', desc: 'Spaghetti, penne, lasagne', count: 10 },
    { slug: 'starters', name: 'Starters', icon: '🥗', desc: 'Bruschetta, garlic bread, arancini', count: 6 },
    { slug: 'mains', name: 'Main Courses', icon: '🍽️', desc: 'Chicken parmigiana, risotto', count: 6 },
    { slug: 'sides', name: 'Sides & Salads', icon: '🥒', desc: 'Caesar salad, garlic bread, fries', count: 5 },
    { slug: 'desserts', name: 'Desserts', icon: '🍰', desc: 'Tiramisu, panna cotta, gelato', count: 5 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Soft drinks, Italian coffee', count: 5 },
  ],
  American: [
    { slug: 'burgers', name: 'Burgers', icon: '🍔', desc: 'Smash burgers, loaded burgers', count: 10 },
    { slug: 'wings', name: 'Wings', icon: '🍗', desc: 'Buffalo, BBQ, peri peri wings', count: 6 },
    { slug: 'wraps-subs', name: 'Wraps & Subs', icon: '🌯', desc: 'Loaded wraps, sub sandwiches', count: 6 },
    { slug: 'loaded-fries', name: 'Loaded Fries', icon: '🍟', desc: 'Loaded fries, curly fries', count: 5 },
    { slug: 'sides', name: 'Sides', icon: '🧅', desc: 'Onion rings, coleslaw, corn', count: 5 },
    { slug: 'milkshakes', name: 'Milkshakes & Drinks', icon: '🥤', desc: 'Milkshakes, smoothies, sodas', count: 6 },
    { slug: 'desserts', name: 'Desserts', icon: '🍰', desc: 'Cookies, brownies, sundaes', count: 4 },
  ],
  Mexican: [
    { slug: 'tacos', name: 'Tacos', icon: '🌮', desc: 'Soft & hard shell tacos', count: 6 },
    { slug: 'burritos', name: 'Burritos & Bowls', icon: '🌯', desc: 'Loaded burritos, burrito bowls', count: 6 },
    { slug: 'quesadillas', name: 'Quesadillas', icon: '🧀', desc: 'Cheese and meat quesadillas', count: 4 },
    { slug: 'nachos', name: 'Nachos & Starters', icon: '🫔', desc: 'Loaded nachos, guacamole, salsa', count: 5 },
    { slug: 'sides', name: 'Sides', icon: '🌽', desc: 'Rice, beans, elote, chips', count: 5 },
    { slug: 'beverages', name: 'Beverages', icon: '🥤', desc: 'Horchata, agua fresca, sodas', count: 4 },
  ],
  Japanese: [
    { slug: 'sushi', name: 'Sushi & Sashimi', icon: '🍣', desc: 'Nigiri, maki, sashimi', count: 10 },
    { slug: 'ramen', name: 'Ramen & Noodles', icon: '🍜', desc: 'Tonkotsu, miso, shoyu ramen', count: 6 },
    { slug: 'tempura', name: 'Tempura & Fried', icon: '🍤', desc: 'Prawn tempura, katsu', count: 5 },
    { slug: 'rice-bowls', name: 'Rice Bowls', icon: '🍚', desc: 'Donburi, chirashi', count: 5 },
    { slug: 'sides', name: 'Sides', icon: '🥢', desc: 'Edamame, gyoza, miso soup', count: 5 },
    { slug: 'beverages', name: 'Beverages', icon: '🍵', desc: 'Green tea, sake, soft drinks', count: 4 },
  ],
};

/**
 * Returns cuisine-specific categories. Falls back to generic if cuisine not mapped.
 */
export function getCuisineCategoryTemplates(
  cuisines: string[],
  businessType: string,
): Array<{ id: string; categorySlug: string; categoryName: string; icon: string; description: string; itemCountHint: number; isRecommended: boolean; businessType: string }> {
  const results: typeof CUISINE_CATEGORIES[string] = [];
  const seenSlugs = new Set<string>();

  for (const cuisine of cuisines) {
    const cats = CUISINE_CATEGORIES[cuisine];
    if (cats) {
      for (const c of cats) {
        if (!seenSlugs.has(c.slug)) {
          seenSlugs.add(c.slug);
          results.push(c);
        }
      }
    }
  }

  if (results.length === 0) return []; // Let backend DB handle it

  return results.map((c, i) => ({
    id: `cat-${c.slug}-${i}`,
    categorySlug: c.slug,
    categoryName: c.name,
    icon: c.icon,
    description: c.desc,
    itemCountHint: c.count,
    isRecommended: true,
    businessType: businessType || 'RESTAURANT',
  }));
}

// ============ Discovery Context ============

/**
 * Builds context for the Discovery step — lists available cuisines
 * so the AI can match user descriptions to real cuisine types.
 */
export async function buildDiscoveryContext(): Promise<string> {
  const cuisines = await getAvailableCuisines();
  if (cuisines.length === 0) return '';

  return `
AVAILABLE CUISINES IN OUR DATABASE (use these to classify the user's business):
${cuisines.join(', ')}

When the user describes their business, match it to one or more of these cuisine types.
This helps us suggest the most relevant menu items from our curated database of 500+ authentic dishes.`;
}

// ============ Categories Context ============

/**
 * Builds context for the Categories step — shows which food types
 * (categories) exist for the detected cuisines.
 */
export async function buildCategoryContext(cuisines: string[]): Promise<string> {
  if (cuisines.length === 0) return '';

  const grouped = await getDishesGroupedByType(cuisines);
  if (Object.keys(grouped).length === 0) return '';

  const lines: string[] = [
    `\nREFERENCE CATEGORIES for ${cuisines.join(', ')} cuisine(s):`,
  ];

  for (const [type, dishes] of Object.entries(grouped)) {
    // Limit to 15 dish names per type to keep prompt manageable
    const sample = dishes.slice(0, 15);
    const suffix = dishes.length > 15 ? ` (+${dishes.length - 15} more)` : '';
    lines.push(`• ${type}: ${sample.join(', ')}${suffix}`);
  }

  lines.push(
    '\nUse these real dish names when suggesting categories. Group them logically (e.g., "Curries", "Grills", "Rice Dishes", "Desserts", "Beverages").',
  );

  return lines.join('\n');
}

// ============ Items Context ============

/**
 * Builds context for the Items step — provides real dish names
 * from the reference data for the AI to use when generating items.
 */
export async function buildItemsContext(
  cuisines: string[],
  keywords: string[],
  dietaryType?: string,
): Promise<string> {
  const lines: string[] = [];

  // 1. Cuisine-specific dishes from main-categories
  if (cuisines.length > 0) {
    const dishes = await getDishesByCuisine(cuisines);
    if (dishes.length > 0) {
      lines.push(`\nAUTHENTIC DISH NAMES from our curated database (USE THESE for item names):`);

      // Group by type and limit
      const byType: Record<string, MainCategoryDish[]> = {};
      for (const d of dishes) {
        if (!byType[d.type]) byType[d.type] = [];
        byType[d.type].push(d);
      }

      for (const [type, typeDishes] of Object.entries(byType)) {
        const sample = typeDishes.slice(0, 12);
        lines.push(`  ${type}: ${sample.map(d => d.name).join(', ')}`);
      }
    }
  }

  // 2. Item templates from Universal-Menu (for fast-food sectors)
  const templates = await getRelevantItemTemplates(keywords);
  if (templates.length > 0) {
    lines.push(`\nITEM TEMPLATES with pricing and dietary info:`);
    for (const t of templates.slice(0, 10)) {
      const price = `£${(t.base_price / 100).toFixed(2)}`;
      lines.push(`  - ${t.name} (${price}, ${t.dietary_status})${t.description ? ': ' + t.description : ''}`);
    }
  }

  // 3. Dietary replacement rules
  if (dietaryType === 'halal') {
    const rules = await getDietaryReplacementRules();
    if (rules.length > 0) {
      lines.push(`\nHALAL SUBSTITUTION RULES (apply these automatically):`);
      for (const r of rules) {
        lines.push(`  - Replace "${r.target}" → "${r.suggestion}" (${r.type})`);
      }
    }
  }

  if (lines.length === 0) return '';

  lines.push(
    '\nPRIORITY: Use real dish names from the database above. Only invent names if no match exists.',
  );

  return lines.join('\n');
}

// ============ Modifiers Context ============

/**
 * Builds context for the Modifiers step — provides modifier blueprints
 * from Universal-Menu.json so the AI creates consistent modifier groups.
 */
export async function buildModifiersContext(
  businessType: string,
  keywords: string[],
  dietaryType?: string,
): Promise<string> {
  const lines: string[] = [];

  // 1. Relevant modifier blueprints
  const blueprints = await getRelevantModifierBlueprints(businessType, keywords);
  if (Object.keys(blueprints).length > 0) {
    lines.push(`\nMODIFIER BLUEPRINTS from our reference database (use these as templates):`);

    for (const [key, bp] of Object.entries(blueprints)) {
      const selectType = bp.multi_select ? 'multi_select' : 'single_select';
      const options = bp.options
        .map(o => {
          const dietary = dietaryType === 'halal' && o.dietary_status === 'non_halal'
            ? ' ⚠️ NON-HALAL'
            : '';
          return `${o.name} [${o.dietary_status}]${dietary}`;
        })
        .join(', ');
      lines.push(`  ${bp.name} (${selectType}): ${options}`);
    }
  }

  // 2. Dietary replacement rules for modifiers
  if (dietaryType === 'halal') {
    const rules = await getDietaryReplacementRules();
    if (rules.length > 0) {
      lines.push(`\nHALAL RULES — exclude or substitute these in modifiers:`);
      for (const r of rules) {
        lines.push(`  - "${r.target}" → use "${r.suggestion}" instead`);
      }
    }
  }

  if (lines.length === 0) return '';

  lines.push(
    '\nUse these blueprints as a starting point. Adapt options based on the specific item and business.',
  );

  return lines.join('\n');
}

// ============ Attributes Context ============

/**
 * Builds context for attribute detection — lists valid attribute values
 * from menu_global_attributes.json instead of hardcoding them in prompts.
 */
export async function buildAttributesContext(): Promise<string> {
  const attrs = await getGlobalAttributes();
  if (!attrs) return '';

  const lines: string[] = ['\nVALID ATTRIBUTE OPTIONS (from our standards database):'];

  const relevantKeys = ['dietary_type', 'allergens', 'spice_level', 'meal_type', 'preparation_method'];

  for (const key of relevantKeys) {
    const group = attrs.menu_global_attributes[key];
    if (group) {
      const options = group.options.map(o => `${o.id} (${o.icon} ${o.label})`).join(', ');
      lines.push(`  ${group.label}: ${options}`);
    }
  }

  return lines.join('\n');
}
