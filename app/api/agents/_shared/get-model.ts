import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export type AgentTaskType = 'specialist' | 'researcher';

export function getAgentModel(task: AgentTaskType = 'specialist'): LanguageModel {
  if (!process.env.DEEPSEEK_API_KEY) {
    return google('gemini-flash-latest');  // dev fallback
  }
  if (task === 'researcher') return deepseek('deepseek-reasoner');
  return deepseek('deepseek-chat');
}

export function getFallbackModel(): LanguageModel {
  return google('gemini-flash-latest');
}
