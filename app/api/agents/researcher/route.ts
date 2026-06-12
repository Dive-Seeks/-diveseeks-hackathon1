import { generateObject } from 'ai';
import { getAgentModel, getFallbackModel } from '../_shared/get-model';
import { z } from 'zod';
import { withRetry } from '../_shared/with-retry';

const ResearcherSchema = z.object({
  findings: z.string().describe('Detailed research findings relevant to the business'),
  suggestedFocus: z.array(z.string()).describe('2-3 key focus areas derived from the research'),
  sourcesUsed: z.array(z.string()).describe('List of sources (pgvector docs, web, etc.) used to gather info'),
});

export async function POST(req: Request) {
  try {
    const { query, webSearchRequested, cuisines = [], businessType = 'RESTAURANT', sessionSummary = '' } = await req.json();
    
    const prompt = `You are a specialized Researcher Agent for Dive POS.
Your task is to gather and synthesize industry knowledge, trends, and data about the user's business type and cuisine.

Business details:
- Type: ${businessType}
- Cuisines: ${cuisines.join(', ') || 'General'}
- Query: ${query}
- Session State: ${sessionSummary}
- Web Search Requested: ${webSearchRequested ? 'Yes' : 'No'}

RULES:
1. Do NOT browse the web by default. Use your extensive training knowledge (DeepSeek V4-Pro) and pgvector knowledge first.
2. Only simulate web browsing if Web Search Requested is Yes.
3. Provide deep, expert-level insights focusing on actionable recommendations (menu design, pricing strategy, or marketing approach).
4. Keep the findings concise but highly informative (1-2 paragraphs).
5. Identify 2-3 key focus areas.
`;

    const { object } = await withRetry((attempt) => {
      const currentModel = attempt > 1 ? getFallbackModel() : getAgentModel('researcher');
      return generateObject({
        model: currentModel,
        schema: ResearcherSchema,
        messages: [
          {
            role: 'system',
            content: prompt,
            providerOptions: {
              deepseek: { caching: true }
            }
          },
          {
            role: 'user',
            content: 'Please research and provide findings based on the provided details.',
          }
        ],
      });
    });

    return new Response(JSON.stringify(object), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Specialist Researcher] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
