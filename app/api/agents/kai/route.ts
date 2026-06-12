import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import { searchDishes } from '../_shared/pgvector-search';
import { withRetry } from '../_shared/with-retry';

const ModifierSchema = z.object({
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    modifierType: z.enum(['single_select', 'multi_select']),
    isRequired: z.boolean(),
    minSelections: z.number(),
    maxSelections: z.number(),
    applicableCategories: z.array(z.string()),
    options: z.array(z.object({
      id: z.string(),
      name: z.string(),
      priceAdjustment: z.number(),
      dietaryStatus: z.string().optional(),
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
      existingModifiers = [],
    } = await req.json();
    const authToken = req.headers.get('Authorization') ?? '';

    const query = `${businessType} ${cuisines.join(' ')} modifier options size spice level extras`;
    const blueprints = await searchDishes({ query, sourceType: 'modifier_blueprint', limit: 10, authToken });

    const categoryNames = (categories as any[]).map(c => c.categoryName).join(', ');
    const existingModifierNames = new Set((existingModifiers as any[]).map((m: any) => m.name?.toLowerCase()));

    const prompt = `You are Kai, a menu modifiers specialist.

Business: ${businessType} serving ${cuisines.join(', ') || 'general'} cuisine
Dietary: ${dietaryType || 'not specified'}
Menu categories: ${categoryNames}

${blueprints.length > 0 ? `Reference modifier patterns:\n${blueprints.map(b => `- ${b.content}`).join('\n')}` : ''}

${existingModifierNames.size > 0 ? `SKIP existing modifiers: ${[...existingModifierNames].join(', ')}` : ''}

Generate 3-5 practical modifier groups for this restaurant. Consider:
- Portion size (Small/Regular/Large/Family) — very common
- Spice level (Mild/Medium/Hot/Extra Hot) — for cuisines like Pakistani, Indian
- Cooking preference (Dry/Gravy/Semi-Dry) — for curries
- Add-ons/Extras (extra naan, extra sauce, etc.)
- Meat choices for mixed-dietary restaurants

Each modifier must specify which menu categories it applies to.
Price adjustments in pence (e.g. 100 = £1.00 extra, 0 = no charge).`;

    const { object } = await withRetry((attempt) => {
      const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
      return generateObject({
        model: currentModel,
        schema: ModifierSchema,
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
            content: 'Generate modifiers now.',
          }
        ],
      });
    });

    return Response.json(object);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[Specialist Kai] Error:', err);
    throw err;
  }
}
