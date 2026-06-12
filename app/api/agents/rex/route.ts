import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { withRetry } from '../_shared/with-retry';

// Load reference schema once — small enough to inject fully
const ATTRIBUTES_PATH = path.join(process.cwd(), 'docs/Menus/menu_global_attributes.json');
let attributesRef = '';
try {
  const data = JSON.parse(fs.readFileSync(ATTRIBUTES_PATH, 'utf-8'));
  const attrs = data.menu_global_attributes ?? data;
  const summary = Object.entries(attrs).map(([key, val]: [string, any]) => {
    const opts = val.options?.map((o: any) => `${o.id}(${o.label})`).join(', ') ?? '';
    return `${key}: [${opts}]`;
  }).join('\n');
  attributesRef = summary;
} catch {
  attributesRef = 'dietary_type: [halal, non_halal, vegan, vegetarian]\nallergens: [gluten, nuts, dairy, eggs, soy, shellfish]\nspice_level: [none, mild, medium, hot, extra_hot]';
}

const AttributeSchema = z.object({
  globalAttributes: z.array(z.object({
    attributeKey: z.enum(['dietary_type', 'allergens', 'spice_level', 'meal_type', 'preparation_method']),
    attributeValue: z.string(),
    label: z.string(),
    icon: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    scope: z.enum(['global', 'item']),
    natashaMandatory: z.boolean(),
    description: z.string(),
  })),
  complianceNotes: z.array(z.string()),
});

export async function POST(req: Request) {
  const {
    businessType = 'RESTAURANT',
    cuisines = [],
    dietaryType,
    allergens = [],
    spiceRange,
    serviceModel = [],
    keywords = [],
  } = await req.json();

  const prompt = `You are Rex, a dietary compliance specialist for food businesses.

Available attribute schema:
${attributesRef}

Business profile:
- Type: ${businessType}
- Cuisines: ${cuisines.join(', ') || 'General'}
- Stated dietary type: ${dietaryType || 'not specified'}
- Mentioned allergens: ${allergens.join(', ') || 'none mentioned'}
- Spice range: ${spiceRange || 'not specified'}
- Service: ${serviceModel.join(', ') || 'not specified'}
- Keywords: ${keywords.join(', ') || 'none'}

Your job:
1. Determine which global attributes apply to this entire menu (scope=global)
2. Flag Natasha's Law mandatory allergen labels (natashaMandatory=true for UK food businesses)
3. Add confidence levels — high if explicitly stated, medium if strongly implied, low if inferred
4. Include compliance notes (e.g. "Natasha's Law requires allergen info on all pre-packaged items")

Focus on accuracy. A halal restaurant should have dietary_type=halal with HIGH confidence.
For UK restaurants, allergen labelling is legally required — flag this in complianceNotes.`;

  const { object } = await withRetry((attempt) => {
    const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
    return generateObject({
      model: currentModel,
      schema: AttributeSchema,
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
          content: 'Generate compliance attributes now.',
        }
      ],
    });
  });

  return Response.json(object);
}
