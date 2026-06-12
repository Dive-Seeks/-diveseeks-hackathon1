import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import { searchDishes } from '../_shared/pgvector-search';
import { withRetry } from '../_shared/with-retry';

const ItemSchema = z.object({
  itemsByCategory: z.array(z.object({
    categoryId: z.string().optional(),
    categorySlug: z.string(),
    categoryName: z.string(),
    items: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      basePrice: z.number(),
      dietaryStatus: z.enum(['halal', 'non_halal', 'vegetarian', 'vegan', 'unknown']),
      seoTags: z.array(z.string()),
      spiceLevel: z.enum(['mild', 'medium', 'hot', 'extra_hot', 'none']).optional(),
      allergens: z.array(z.string()).optional(),
    })),
  })),
});

export async function POST(req: Request) {
  try {
    const {
      categories = [],
      cuisines = [],
      businessType = 'RESTAURANT',
      dietaryType,
      spiceRange,
      existingItems = [],
    } = await req.json();
    const authToken = req.headers.get('Authorization') ?? '';

    const existingNames = new Set((existingItems as any[]).map((i: any) => i.name?.toLowerCase()));

    const itemsByCategory: z.infer<typeof ItemSchema>['itemsByCategory'] = [];

    for (const category of categories.slice(0, 8)) {
      const query = `${category.categoryName} ${cuisines.join(' ')} ${dietaryType ?? ''} authentic dishes`;
      const dishes = await searchDishes({ query, limit: 8, authToken });

      const refDishes = dishes
        .map(d => `- ${d.content.split(' — ')[0]} (${d.metadata?.cuisine ?? 'unknown'})`)
        .join('\n');

      const isDrinksCategory = /drink|beverage|juice|lassi|chai|tea|coffee|refresh|mocktail/i.test(category.categoryName);
      const isDessertsCategory = /dessert|sweet|ending|mithai|halwa|kheer/i.test(category.categoryName);
      const isBreadSideCategory = /bread|naan|roti|side|extra|rice|biryani/i.test(category.categoryName);
      const categoryTypeHint = isDrinksCategory
        ? 'THIS IS A DRINKS/BEVERAGES CATEGORY. Generate ONLY liquid drinks: juices, lassis, shakes, teas, coffees, sodas, mocktails. NO food items.'
        : isDessertsCategory
        ? 'THIS IS A DESSERTS CATEGORY. Generate ONLY sweet dessert items: halwa, kheer, gulab jamun, mithai. NO savoury food.'
        : isBreadSideCategory
        ? 'THIS IS A BREADS & SIDES or RICE CATEGORY. Generate ONLY breads, rice dishes, chutneys, or sides. NO main curries or drinks.'
        : 'Generate items that authentically belong in this category. Do not bleed items from other categories.';

      const prompt = `You are Marco, a menu items specialist.

CRITICAL INSTRUCTION: You are generating items ONLY for the category: "${category.categoryName}".
${categoryTypeHint}

Category: "${category.categoryName}" for a ${businessType} serving ${cuisines.join(', ') || 'general'} cuisine.
Dietary type: ${dietaryType || 'not specified'}
Spice range: ${spiceRange || 'mild to hot'}

Reference dishes from similar restaurants:
${refDishes || 'No reference data — use authentic dishes for this cuisine'}

${existingNames.size > 0 ? `SKIP these existing items: ${[...existingNames].join(', ')}` : ''}

Generate 4-6 authentic menu items for the "${category.categoryName}" category.
Each item must:
- Have a real, specific name (e.g. "Peshawari Karahi" not "Karahi Dish")
- Have a compelling description (80-150 chars, sensory language)
- Have a realistic price in pence (e.g. 1299 = £12.99)
- Have appropriate seoTags (2-4 keywords: cuisine, dish type, dietary info)
- Have accurate dietaryStatus based on the business type

Return ONLY items that authentically belong in "${category.categoryName}".`;

      const { object } = await withRetry((attempt) => {
        const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
        return generateObject({
          model: currentModel,
          schema: z.object({ items: ItemSchema.shape.itemsByCategory.element.shape.items }),
          messages: [
            {
              role: 'system',
              content: prompt,
              providerOptions: {
                deepseek: { cacheControl: { type: 'ephemeral' } },
              },
            },
            {
              role: 'user',
              content: `Generate items for ${category.categoryName} now.`,
            }
          ],
        });
      });

      itemsByCategory.push({
        categorySlug: category.categorySlug ?? category.id,
        categoryName: category.categoryName,
        categoryId: category.id,
        items: object.items,
      });
    }

    return Response.json({ itemsByCategory });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[Specialist Marco] Error:', err);
    throw err;
  }
}
