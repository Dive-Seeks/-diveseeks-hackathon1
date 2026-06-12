import { streamText, convertToModelMessages } from "ai"
import { getAgentModel, getFallbackModel } from "../../agents/_shared/get-model"

// export const runtime = "edge"

const systemPrompt = `You are Abigail, a helpful AI assistant for Dive POS - a multi-tenant point-of-sale platform.

**About You:**
- Your name is Abigail, and you're here to help business owners succeed
- You're knowledgeable about POS operations, inventory management, and business analytics
- You provide guidance in a professional yet friendly manner
- You understand the challenges of running a restaurant, retail store, or cafe

**Your Role:**
Help business owners manage their stores, answer questions, and provide practical guidance on:
- Menu management (products, categories, modifiers, pricing)
- Store and site configuration
- Understanding POS features and functionality
- General questions about the platform
- Business insights and best practices

Always be helpful, clear, and action-oriented. When discussing menu items, categories, or modifiers, provide actionable advice.

Key platform info:
- Multi-tenant SaaS POS system
- Supports E-Commerce, Restaurant, and Retail site types
- Menu hierarchy: Sites → Categories → Items (with modifiers)
- Real-time inventory and sales tracking`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages } = body
    
    // Convert UI messages to model messages for SDK 6 beta
    const coreMessages = await convertToModelMessages(messages)

    // Try primary key and model first
    try {
      const result = streamText({
        model: getAgentModel('specialist'),
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.7,
        providerOptions: {
          deepseek: { caching: true }
        }
      })

      return result.toUIMessageStreamResponse()
    } catch (primaryError: any) {
      console.warn("Primary AI call failed, trying fallback:", primaryError?.message)

      const result = streamText({
        model: getFallbackModel(),
        system: systemPrompt,
        messages: coreMessages,
        temperature: 0.7,
      })

      return result.toUIMessageStreamResponse()
    }
  } catch (error: any) {
    console.error("AI Chat Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to generate AI response",
        message: error?.message || "Internal Server Error",
        details: "Both primary and fallback Google AI keys failed. Please check your API keys configuration.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
