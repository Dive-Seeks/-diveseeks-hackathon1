import { z } from 'zod';
import { generateObject } from 'ai';
import { Injectable, Logger } from '@nestjs/common';
import { SoulEngine } from '../common/soul/soul-engine.service';
import { SkillService } from '../workforce/skills/skill.service';
import { PluginService } from '../workforce/plugins/plugin.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

export const ManagerDecisionSchema = z.object({
  decision: z.enum(['approve', 'revision_requested', 'reject']),
  reasoning: z.string().max(500).describe('Why this decision was made'),
  revisionInstructions: z
    .string()
    .max(500)
    .optional()
    .describe('Exact instructions for specialist when revision needed'),
  constraintsToAdd: z
    .array(z.string())
    .optional()
    .describe('Constraints to add to issue for next attempt'),
  tenantMessage: z
    .string()
    .max(300)
    .optional()
    .describe('Message to send to tenant with approval card'),
});

export type ManagerDecision = z.infer<typeof ManagerDecisionSchema>;

@Injectable()
export class BaseManagerService {
  protected readonly logger = new Logger(BaseManagerService.name);

  constructor(
    protected readonly soulEngine: SoulEngine,
    protected readonly providerRouter: AiProviderRouter,
    protected readonly skillService?: SkillService,
    protected readonly pluginService?: PluginService,
  ) {}

  async review(
    domain: string,
    specialistOutput: unknown,
    issueTitle: string,
    constraints?: unknown,
  ): Promise<ManagerDecision> {
    // Attempt to load tenant context (mocked for now, assumes default 'tenant-1')
    const tenantId = '00000000-0000-0000-0000-000000000000';
    const skillsText = this.skillService
      ? await this.skillService.assembleSkillsPrompt(
          tenantId,
          'manager',
          domain,
        )
      : '';
    const pluginsText = this.pluginService
      ? await this.pluginService.assemblePluginToolsPrompt(tenantId, domain)
      : '';

    // Basic assembling of the manager's persona
    const managerSoul = await this.soulEngine.assemble(
      `managers/${domain}`,
      undefined,
      false,
      skillsText,
      pluginsText,
    );

    const prompt = `${managerSoul}

---

# Task to Review
**Issue:** ${issueTitle}
${constraints ? `**Prior constraints:** ${JSON.stringify(constraints)}` : ''}

# Specialist Output
${JSON.stringify(specialistOutput, null, 2)}

Review this output against your domain standards. 
- If it meets the bar: approve it.
- If it needs specific improvements: request revision with exact instructions.
- Only reject if fundamentally wrong and revision cannot fix it.`;

    try {
      const { object } = await generateObject({
        model: this.providerRouter.getModel('specialist'),
        schema: ManagerDecisionSchema,
        prompt,
      });

      return object;
    } catch (err) {
      this.logger.error(
        `Manager ${domain} review failed: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
