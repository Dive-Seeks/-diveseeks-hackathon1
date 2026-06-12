import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import { withRetry } from '../_shared/with-retry';
import * as fs from 'fs';
import * as path from 'path';

const CategorySchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    categorySlug: z.string(),
    categoryName: z.string(),
    icon: z.string(),
    description: z.string(),
    itemCountHint: z.number(),
    isRecommended: z.boolean(),
    rationale: z.string(),
  })),
});

export async function POST(req: Request) {
  try {
    const { businessType = 'RESTAURANT', cuisines = [], keywords = [], dietaryType, existingCategories = [] } = await req.json();
    const authToken = req.headers.get('Authorization') ?? '';

    let referenceCategories: string[] = [];
    try {
      const menusDir = path.join(process.cwd(), 'docs', 'Menus');
      if (fs.existsSync(menusDir)) {
        const files = fs.readdirSync(menusDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const data = JSON.parse(fs.readFileSync(path.join(menusDir, file), 'utf8'));
            if (Array.isArray(data)) {
               for (const item of data) {
                  if (item.name) referenceCategories.push(item.name);
               }
            } else if (data.restaurants) {
               for (const restaurant of data.restaurants) {
                  if (restaurant.categories) {
                     for (const cat of restaurant.categories) {
                        referenceCategories.push(cat.name);
                     }
                  }
               }
            }
          }
        }
      }
    } catch (e) {
      console.error('[Specialist Zara] Failed to read docs/Menus', e);
    }

    const uniqueCategories = [...new Set(referenceCategories)].filter(Boolean);
    const searchTerms = [businessType, ...cuisines, ...keywords, dietaryType].filter(Boolean).map((s: string) => s.toLowerCase());
    
    // Filter categories that match any search term, or just take a random sample if none match
    let matchedCategories = uniqueCategories.filter(c => 
      searchTerms.some(term => c.toLowerCase().includes(term))
    );
    
    if (matchedCategories.length === 0) {
      matchedCategories = uniqueCategories.sort(() => 0.5 - Math.random()).slice(0, 30);
    } else {
      matchedCategories = matchedCategories.slice(0, 30);
    }

    const existingSlugs = new Set((existingCategories as any[]).map(c => c.categorySlug ?? c.slug));

    const prompt = `You are Zara, a menu category specialist for ${businessType.toLowerCase()} businesses.

Business details:
- Type: ${businessType}
- Cuisines: ${cuisines.join(', ') || 'General'}
- Keywords: ${keywords.join(', ') || 'none'}
- Dietary: ${dietaryType || 'not specified'}

Reference categories from our curated menu files: ${matchedCategories.join(', ')}

${existingSlugs.size > 0 ? `EXISTING categories (DO NOT duplicate): ${[...existingSlugs].join(', ')}` : ''}

Generate 5-8 appropriate menu categories for this business. Each must have:
- A clear, customer-facing name (e.g. "Karahi Dishes", not "Category 1")
- A relevant emoji icon
- A short description (1 sentence)
- An estimated item count (3-15)
- Whether it's recommended (top 3-4 should be recommended)
- A brief rationale for why this category fits this business

Return authentic categories that match the cuisine and business type. For Pakistani restaurants include categories like Karahi, Biryanis, BBQ & Grills, Breads & Extras.`;

    const { object } = await withRetry((attempt) => {
      const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
      return generateObject({
        model: currentModel,
        schema: CategorySchema,
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
            content: 'Generate menu categories now.',
          }
        ],
      });
    });

    return Response.json(object);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[Specialist Zara] Error:', err);
    throw err;
  }
}
