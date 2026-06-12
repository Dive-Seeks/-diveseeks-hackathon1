import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { searchDishes } from '../_shared/pgvector-search';
import { withRetry } from '../_shared/with-retry';

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(2),
});

export async function POST(req: Request) {
  try {
    const {
      sessionState = {},
      lastSpecialist = '',
      lastResultSummary = '',
      completedSteps = [],
    } = await req.json();

    const authToken = req.headers.get('Authorization') ?? '';

    const { cuisines = [], dietaryType = '', currentStep = '', businessType = 'RESTAURANT' } = sessionState;

    const query = [
      `${businessType.toLowerCase()} menu`,
      cuisines.join(' '),
      dietaryType,
      `after ${lastSpecialist} specialist`,
      lastResultSummary,
    ].filter(Boolean).join(' ');

    const dishes = await searchDishes({ query, limit: 10, authToken });

    const menuContext = dishes
      .map(d => d.content.split(' — ')[0])
      .slice(0, 8)
      .join(', ');

    const completedList = completedSteps.join(', ') || 'none';

    const prompt = `You are helping Abigail, an AI menu coordinator, decide what to ask a restaurant owner next.

Restaurant profile:
- Business type: ${businessType}
- Cuisines: ${cuisines.join(', ') || 'not specified'}
- Dietary type: ${dietaryType || 'not specified'}
- Current wizard step: ${currentStep}
- Completed steps: ${completedList}
- Last specialist: ${lastSpecialist} — ${lastResultSummary}

Reference menu knowledge for this cuisine: ${menuContext || 'general restaurant menu patterns'}

Generate exactly 1-2 short, specific questions Abigail should ask the restaurant owner next to improve their menu.
Rules:
- Questions must be actionable and answerable with a yes/no or short answer
- Do NOT repeat anything already in completedSteps
- Plain simple English — the owner may not be tech-savvy
- Max 12 words per question
- Focus on what is MISSING from their menu setup given the cuisine and dietary type`;

    const { object } = await withRetry(() => generateObject({
      model: google('gemini-flash-latest'),
      schema: SuggestionsSchema,
      prompt,
    }));

    return Response.json({ suggestions: object.suggestions });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[abigail-suggest] Error:', err);
    return Response.json({ suggestions: [] });
  }
}
