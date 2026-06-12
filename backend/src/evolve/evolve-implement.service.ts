import { Injectable, Logger } from '@nestjs/common';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { EvolveDiagnosis } from './evolve-analyzer.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

export interface PromptPatch {
  newPrompt: string;
  changeDescription: string; // human-readable diff summary
  changeType:
    | 'add_constraint'
    | 'remove_hint'
    | 'sharpen_rubric'
    | 'clarify_scope';
}

const PromptPatchSchema = z.object({
  newPrompt: z.string(),
  changeDescription: z.string(),
  changeType: z.enum([
    'add_constraint',
    'remove_hint',
    'sharpen_rubric',
    'clarify_scope',
  ]),
});

@Injectable()
export class EvolveImplementService {
  private readonly logger = new Logger(EvolveImplementService.name);

  constructor(private readonly aiRouter: AiProviderRouter) {}

  async implement(
    specialistId: string,
    currentPrompt: string,
    diagnosis: EvolveDiagnosis,
  ): Promise<PromptPatch> {
    this.logger.log(`Implementing prompt evolution for ${specialistId}...`);

    const result = await generateText({
      model: this.aiRouter.getEvolveModel('implementer'),
      experimental_output: Output.object({ schema: PromptPatchSchema }),
      prompt: `
You are a prompt engineer for an AI coding specialist system.

Specialist: ${specialistId}
Diagnosis: ${diagnosis.type}
Recommendation: ${diagnosis.recommendation}

Current system prompt:
---
${currentPrompt}
---

Produce a modified version of this prompt that addresses the diagnosis.

Rules for modification:
- If WEAK_TOO_HIGH: remove context that hints at the solution. Make the task more open-ended.
- If STRONG_TOO_LOW: sharpen the evaluation criteria. Add explicit quality standards.
- If BOTH_FAILING: clarify the task scope and output format expectations.
- If INCONSISTENT: add rubric criteria that are more discriminating.

IMPORTANT:
- Preserve the specialist's identity (name, role, domain boundaries)
- Only change what the diagnosis requires — do not rewrite the whole prompt
- The new prompt must still align with the vision: ${diagnosis.recommendation}
`,
    });

    return result.experimental_output;
  }
}
