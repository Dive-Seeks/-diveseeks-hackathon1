import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { buildCategoryContext } from '@/lib/menu-context-builder';

export async function POST(req: Request) {
  const { messages, cuisines = [], keywords = [] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Build reference context from docs/Menus based on detected cuisines
  const categoryCtx = await buildCategoryContext(cuisines);

  const result = streamText({
    model: google('gemini-flash-latest'),
    stopWhen: stepCountIs(6),
    system: `You are Abigail, a friendly AI menu assistant for Dive POS. The user has described their business and now has a list of suggested menu categories to review.

Your job: help them customise their category selection — add new categories they need, remove ones they don't want, or answer questions about what categories make sense for their business.

RULES:
- When the user asks to add a category (e.g. "add a Desserts section"), call addCategory with a sensible emoji icon and short description.
- When the user asks to remove or deselect a category (e.g. "remove Coffee"), call removeCategory with the name they mentioned.
- Keep replies SHORT — 1 sentence confirmation after each action.
- If the user asks what categories suit their business, advise them briefly.
- Never list bullet points. Conversational only.
- Act immediately on requests — don't ask for confirmation before calling a tool.
${categoryCtx}`,
    messages: modelMessages,
    tools: {
      addCategory: tool({
        description: 'Add a new custom category to the menu list and auto-select it.',
        inputSchema: z.object({
          name: z.string().describe('Category display name, e.g. "Desserts"'),
          icon: z.string().describe('Single emoji icon for the category'),
          description: z.string().describe('Short 1-sentence description of what this category contains'),
        }),
        execute: async ({ name, icon, description }) => ({
          category: {
            id: `cat-custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
            name,
            displayName: name,
            icon,
            description,
          },
        }),
      }),

      removeCategory: tool({
        description: 'Deselect/remove a category from the selection by name.',
        inputSchema: z.object({
          name: z.string().describe('The category name to remove, exactly as the user mentioned it'),
        }),
        execute: async ({ name }) => ({ removedName: name }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
