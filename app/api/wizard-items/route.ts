import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { buildItemsContext } from '@/lib/menu-context-builder';

export async function POST(req: Request) {
  const { messages, cuisines = [], keywords = [], dietaryType } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Build reference context from docs/Menus (real dish names, templates, halal rules)
  const itemsCtx = await buildItemsContext(cuisines, keywords, dietaryType);

  const result = streamText({
    model: google('gemini-flash-latest'),
    stopWhen: stepCountIs(6),
    system: `You are Abigail, a friendly AI menu assistant for Dive POS. The user is reviewing and customising menu items for their restaurant categories.

Your job: help them add new items, remove items they don't want, or adjust prices.

RULES:
- When the user asks to add items (e.g. "add 3 burgers", "add a Margherita pizza"), call addItems with realistic items.
- Prices are in pence/cents — e.g. £8.99 = 899, £12.50 = 1250. Be realistic for the cuisine type.
- dietaryStatus: use "halal" if the restaurant mentioned halal; "vegan"/"vegetarian" only if item is clearly so; otherwise "non_halal".
- Tags: 2-3 short words like "popular", "chef's special", "spicy", "new".
- When the user asks to remove an item by name, call removeItem.
- When the user asks to change a price, call adjustPrice.
- Keep replies SHORT — 1 sentence confirmation after each action.
- Never list bullet points. Conversational only.
- Generate distinct, creative item names — not generic ones.
- PRIORITY: Use real dish names from the reference database below when available. Only invent names if no match exists.
${itemsCtx}`,
    messages: modelMessages,
    tools: {
      addItems: tool({
        description: 'Add one or more new menu items to a category. Call when user asks to add items.',
        inputSchema: z.object({
          items: z.array(z.object({
            name: z.string().describe('Item display name, e.g. "Smoky BBQ Burger"'),
            description: z.string().max(150).describe('Appetising 1-sentence description'),
            basePrice: z.number().int().describe('Price in pence/cents, e.g. 899 for £8.99'),
            categoryId: z.string().describe('The category ID this item belongs to'),
            categoryName: z.string().describe('The category name for display'),
            dietaryStatus: z.enum(['halal', 'non_halal', 'vegan', 'vegetarian', 'unknown']),
            tags: z.array(z.string()).max(3).default([]),
          })).min(1).describe('Items to add to the menu'),
        }),
        execute: async ({ items }) => ({
          items: items.map((item, idx) => ({
            ...item,
            id: `item-ai-${Date.now()}-${idx}`,
            isRetail: false,
            modifiers: [],
          })),
        }),
      }),

      adjustPrice: tool({
        description: 'Adjust the price of an existing item by name.',
        inputSchema: z.object({
          itemName: z.string().describe('Name of the item to adjust (partial match ok)'),
          newPrice: z.number().int().describe('New price in pence/cents'),
        }),
        execute: async ({ itemName, newPrice }) => ({ itemName, newPrice }),
      }),

      removeItem: tool({
        description: 'Remove an existing menu item by name.',
        inputSchema: z.object({
          itemName: z.string().describe('Name of the item to remove (partial match ok)'),
        }),
        execute: async ({ itemName }) => ({ removedName: itemName }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
