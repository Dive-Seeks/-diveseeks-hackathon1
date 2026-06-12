import { Injectable, Logger } from '@nestjs/common';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

@Injectable()
export class WorkflowSpecGeneratorService {
  private readonly logger = new Logger(WorkflowSpecGeneratorService.name);

  async generateWorkflowSpec(plan: any): Promise<any> {
    this.logger.log(
      '[WorkflowSpecGenerator] Generating workflow spec from plan',
    );

    const { object } = await generateObject({
      model: google('gemini-2.5-pro'),
      schema: z.object({
        name: z.string(),
        description: z.string(),
        steps: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            specialistId: z.string(),
            prompt: z.string(),
            dependencies: z.array(z.string()).optional(),
            retryPolicy: z
              .object({
                maxAttempts: z.number(),
                backoff: z.enum(['fixed', 'exponential']),
              })
              .optional(),
            saga: z
              .object({
                compensationPrompt: z.string(),
              })
              .optional(),
          }),
        ),
      }),
      prompt: `Translate the following project plan into a workflow specification for the Abigail Workflow Engine.
      
      Project Plan:
      ${JSON.stringify(plan, null, 2)}
      
      Define the steps, their dependencies, retry policies, and saga compensations.`,
    });

    return object;
  }
}
