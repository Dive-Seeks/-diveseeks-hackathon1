import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Injectable()
export class PlanGeneratorService {
  private readonly logger = new Logger(PlanGeneratorService.name);

  async generatePlan(
    ideationSummary: string,
    originatingRequest: string,
  ): Promise<any> {
    this.logger.log(
      '[PlanGenerator] Generating structured plan from ideation summary',
    );

    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        goal: z.string(),
        sub_goals: z.array(z.string()),
        constraints: z.array(z.string()),
        success_criteria: z.array(z.string()),
        estimated_workflow_def: z.string(),
        risks: z.array(z.string()),
        unknowns: z.array(z.string()),
      }),
      prompt: `Translate the following ideation summary into a structured project plan.
      
      User Request: ${originatingRequest}
      Ideation Summary: ${ideationSummary}
      
      Ensure the plan is detailed, technically sound, and covers all constraints mentioned.`,
    });

    return object;
  }
}
