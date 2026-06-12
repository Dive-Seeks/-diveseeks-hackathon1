import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import { searchDishes } from '../_shared/pgvector-search';
import { withRetry } from '../_shared/with-retry';

const AuditResultSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  currentDescription: z.string(),
  seoScore: z.number().min(0).max(100),
  issues: z.array(z.string()),
  suggestedDescription: z.string(),
  suggestedSeoTags: z.array(z.string()),
});

const AuditResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  auditResults: z.array(AuditResultSchema),
  topIssues: z.array(z.string()),
  quickWins: z.array(z.string()),
});

const RewriteResponseSchema = z.object({
  rewrites: z.array(z.object({
    itemId: z.string(),
    itemName: z.string(),
    description: z.string(),
    seoTags: z.array(z.string()),
    seoScore: z.number().min(0).max(100),
  })),
});

export async function POST(req: Request) {
  try {
    const {
      mode = 'audit',
      items = [],
      cuisines = [],
      businessType = 'RESTAURANT',
      dietaryType,
    } = await req.json();
    const authToken = req.headers.get('Authorization') ?? '';

    if (mode === 'audit') {
      const itemSummary = (items as any[]).map((item: any) =>
        `- "${item.name}" (ID: ${item.id}): "${item.description || 'NO DESCRIPTION'}"`
      ).join('\n');

      const scoreRules = `
Scoring rules (start at 100, deduct):
- Missing description: -30
- Description under 60 chars: -15
- Description under 80 chars: -10
- Generic name (e.g. "Chicken Dish"): -20
- No seoTags: -10
- Missing allergen info (Natasha's Law): -15
- Excellent specific description (100+ chars): +5 bonus`;

      const prompt = `You are Sage, an SEO and menu content specialist.

Audit these ${businessType} menu items for SEO quality and Natasha's Law compliance:
${itemSummary}

Context:
- Cuisine: ${cuisines.join(', ') || 'General'}
- Dietary: ${dietaryType || 'not specified'}

${scoreRules}

For each item, provide:
1. An SEO score (0-100)
2. Specific issues found
3. A rewritten description (80-150 chars, sensory language, includes cuisine keywords)
4. 3-5 SEO tags (searchable keywords)

Also provide:
- Overall score (average of all items)
- Top 3 issues across the menu
- Top 3 quick wins (easiest fixes)`;

      const { object } = await withRetry((attempt) => {
        const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
        return generateObject({
          model: currentModel,
          schema: AuditResponseSchema,
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
              content: 'Audit the items now.',
            }
          ],
        });
      });

      return Response.json(object);
    }

    // mode === 'rewrite' — targeted rewrites using pgvector for high-performing phrases
    const query = `${businessType} ${cuisines.join(' ')} ${dietaryType ?? ''} menu descriptions`;
    const refPhrases = await searchDishes({ query, limit: 10, authToken });

    const refContent = refPhrases.map(r => r.content.split(' — ').slice(1).join(' ')).filter(Boolean).join('; ');

    const itemSummary = (items as any[]).map((item: any) =>
      `- "${item.name}" (ID: ${item.id}, current: "${item.description || 'none'}")`
    ).join('\n');

    const prompt = `You are Sage, an SEO specialist. Rewrite these menu item descriptions to be compelling, SEO-optimised, and Natasha's Law compliant.

Items to rewrite:
${itemSummary}

Reference high-performing descriptions from similar restaurants:
${refContent || 'Use authentic, sensory language for this cuisine type.'}

Requirements for each rewrite:
- 80-150 characters
- Include cuisine keywords (${cuisines.join(', ')})
- Mention key ingredients
- Sensory language (crispy, tender, aromatic, slow-cooked, etc.)
- If halal: mention "halal" naturally
- Generate 3-5 SEO tags

Score each rewrite 0-100 based on length, keywords, and specificity.`;

    const { object } = await withRetry((attempt) => {
      const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('specialist');
      return generateObject({
        model: currentModel,
        schema: RewriteResponseSchema,
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
            content: 'Rewrite the items now.',
          }
        ],
      });
    });

    return Response.json(object);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[Specialist Sage] Error:', err);
    throw err;
  }
}
