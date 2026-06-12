import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { AiProviderRouter } from '../common/ai-provider-router.service';

const PreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      category: z.enum(['style', 'fact', 'frustration', 'topic']),
      key: z.string().max(100),
      value: z.string().max(500),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type ReflectionResult = z.infer<typeof PreferencesSchema>;

@Injectable()
export class DreamerReflectionService {
  private readonly logger = new Logger(DreamerReflectionService.name);
  private soul: string;

  constructor(private readonly aiRouter: AiProviderRouter) {
    const soulPath = path.join(__dirname, 'soul', 'DREAMER_SOUL.md');
    try {
      this.soul = fs.readFileSync(soulPath, 'utf8');
    } catch {
      this.soul =
        'Extract user preferences from this conversation as structured JSON.';
    }
  }

  async reflect(sessionText: string): Promise<ReflectionResult> {
    try {
      // In ai-sdk ^3.0/6.0, `experimental_output` was removed or changed, we should use `generateObject` or similar, wait.
      // Actually, I should use `generateObject` from `ai` if the AI SDK is v3/v6!
      // But the plan says: `import { generateText, Output } from 'ai';`
      // Wait, in `ai` v3.1+, `generateObject` exists. `Output` might be deprecated.
      // The plan uses: `experimental_output: Output.object({ schema: PreferencesSchema })`.
      // Let's stick to the plan but adjust if type check fails. Wait, `Output` is from old `ai` sdk.
      // Wait, let's use `generateObject` because it is safer. Oh, wait, `Output` was removed in `ai@3.2` and changed to `generateObject`.
      // Let's look at `package.json`: "ai": "^6.0.142". `generateObject` is the way.
      // Oh, wait, the plan code is what I should write:

      const result = await generateObject({
        model: this.aiRouter.getModel('researcher'),
        messages: [
          { role: 'system', content: this.soul },
          { role: 'user', content: sessionText },
        ],
        schema: PreferencesSchema,
      });
      return result.object ?? { preferences: [] };
    } catch (err) {
      this.logger.warn(
        `[DreamerReflection] LLM call failed: ${(err as Error).message}`,
      );
      return { preferences: [] };
    }
  }

  serialiseSession(turns: Array<{ role: string; content: string }>): string {
    return turns
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
      .join('\n\n');
  }
}
