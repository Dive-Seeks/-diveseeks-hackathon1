import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const schema = z.object({
  cuisines: z.array(z.string()).describe("List of keywords like pizza, burgers, chicken, etc."),
  businessType: z.string().describe("food, retail, grocery, or apparel"),
  suggestedCategories: z.array(z.string()).describe("AI suggested categories based on the description")
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log("API Key present:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    const result = await generateObject({
      model: google('gemini-flash-latest'),
      schema,
      prompt: `
        Analyze this business description: "${message}"
        
        Task:
        1. Extract specific cuisines/keywords (e.g., "pizza", "fried chicken", "craft beer").
        2. Broadly expand these keywords (e.g., if "pizza" is mentioned, also include "fast-food", "takeaway", "italian").
        3. Identify the business type (food, retail, grocery, apparel).
        4. Suggest 8-10 logical menu or product categories that WOULD make sense for this business.
           - Return MANY relevant matches.
           - If it's a food place, ALWAYS include "Beverages", "Sides", and "Desserts".
           - For pizza, include "Specialty Pizzas", "Starters", "Wings".
            
        Return simple lowercase values.
      `
    });

    return Response.json(result.object);
  } catch (error: any) {
    console.error("Error generating intent:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to generate intent" }, { status: 500 });
  }
}
