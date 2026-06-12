import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AgentsService } from '../agents/agents.service';
import { Agent } from '../agents/entities/agent.entity';
import { AiErrorClassifierService } from '../common/ai-error-classifier.service';
import { ToolGuardrailsService } from '../common/tool-guardrails.service';
import { ToolLoopError } from '../common/errors/tool-loop.error';
import { EpisodeJobData } from '../memory/brain-memory.processor';
import { INDUSTRY_REGISTRY } from '../jos/industry-registry';

const SPECIALIST_ROSTER: Record<string, { name: string; title: string }> = {
  // Restaurant specialists
  menu: { name: 'Zara', title: 'Menu Specialist' },
  marketing: { name: 'Marco', title: 'Marketing Specialist' },
  analytics: { name: 'Kai', title: 'Analytics Specialist' },
  inventory: { name: 'Rex', title: 'Inventory Specialist' },
  seo: { name: 'Sage', title: 'SEO Specialist' },
  images: { name: 'Nova', title: 'Image Specialist' },
  website: { name: 'Atlas', title: 'Website Specialist' },
  copy: { name: 'Aria', title: 'Copy Specialist' },
  design: { name: 'Pixel', title: 'Design Specialist' },
  stock: { name: 'Depot', title: 'Stock Specialist' },
  loyalty: { name: 'Luma', title: 'Loyalty Specialist' },
  // Retail specialists
  pricing: { name: 'Rio', title: 'Pricing Specialist' },
  customer_support: { name: 'Vera', title: 'Customer Support Specialist' },
  content: { name: 'Clio', title: 'Content Specialist' },
  inventory_ops: { name: 'Bolt', title: 'Inventory Ops Specialist' },
  analytics_report: { name: 'Finn', title: 'Analytics Reporting Specialist' },
  merchandising: { name: 'Mira', title: 'Merchandising Specialist' },
  promotions: { name: 'Dash', title: 'Promotions Specialist' },
  // Ecommerce specialists
  product_catalogue: { name: 'Luna', title: 'Product Catalogue Specialist' },
  seo_cro: { name: 'Kira', title: 'SEO/CRO Specialist' },
  email_sms: { name: 'Ember', title: 'Email/SMS Specialist' },
  fulfilment: { name: 'Scout', title: 'Fulfilment Specialist' },
  analytics_cx: { name: 'Flux', title: 'Analytics & CX Specialist' },
  reviews_loyalty: { name: 'Ivy', title: 'Reviews & Loyalty Specialist' },
  // Cross-business specialists
  ads: { name: 'Sage', title: 'Ad Manager Specialist' },
  // CA Department
  accounting: { name: 'Felix', title: 'CA Accounting Specialist' },
};

@Injectable()
export class HireService {
  private readonly logger = new Logger(HireService.name);

  constructor(
    private readonly agentsService: AgentsService,
    private readonly aiErrorClassifier: AiErrorClassifierService,
    private readonly toolGuardrails: ToolGuardrailsService,
    @InjectQueue('brain-memory') private readonly brainMemoryQueue: Queue,
  ) {}

  async ensureSpecialist(tenantId: string, domain: string): Promise<Agent> {
    // Find existing active specialist for this tenant + domain
    const existing = await this.agentsService.findAll(tenantId);
    const found = existing.find(
      (a) =>
        a.domain === domain &&
        a.role === 'specialist' &&
        a.status !== 'terminated',
    );
    if (found) return found;

    const coordinator =
      await this.agentsService.findCoordinatorForTenant(tenantId);
    if (!coordinator)
      throw new Error(
        `No coordinator found for tenant ${tenantId} — boot may have failed`,
      );

    const def = SPECIALIST_ROSTER[domain];
    if (!def)
      throw new BadRequestException(
        `No specialist defined for domain: ${domain}`,
      );

    this.logger.log(
      `Hiring ${def.name} for tenant ${tenantId}, domain ${domain}`,
    );
    return this.agentsService.hire(
      {
        name: def.name,
        role: 'specialist',
        title: def.title,
        domain,
        tenantId,
        reportsToId: coordinator.id,
        skillPath: `agents/souls/specialists/${domain}/AGENTS.md`,
        budgetMonthlyCents: 50000,
      },
      coordinator.id,
    );
  }

  async ensureIndustry(industry: string): Promise<Agent> {
    const abigail = await this.agentsService.findByNameAndRole(
      'Abigail',
      'global-ceo',
    );
    if (!abigail) throw new Error('Global CEO (Abigail) not found');

    const config = INDUSTRY_REGISTRY[industry];
    if (!config) throw new BadRequestException(`Unknown industry: ${industry}`);

    let ceo = await this.agentsService.findByNameAndRole(
      config.ceoName,
      'industry-ceo',
    );
    if (!ceo) {
      this.logger.log(
        `Seeding Industry CEO: ${config.ceoName} for ${industry}`,
      );
      ceo = await this.agentsService.hire(
        {
          name: config.ceoName,
          role: 'industry-ceo',
          title: config.ceoTitle,
          domain: 'platform',
          industry,
          reportsToId: abigail.id,
          budgetMonthlyCents: 1000000,
        },
        abigail.id,
      );

      // Seed default managers for this industry
      for (const m of config.defaultManagers) {
        await this.agentsService.hire(
          {
            name: m.name,
            role: 'manager',
            title: m.name,
            domain: m.domain,
            industry,
            reportsToId: ceo.id,
            budgetMonthlyCents: 100000,
          },
          ceo.id,
        );
      }
    }

    return ceo;
  }

  /**
   * onStepFinish callback — wire this into any generateObject/streamText call
   * inside HireService that uses maxSteps.
   *
   * Usage:
   *   onStepFinish: async ({ toolResults }) => {
   *     for (const tr of toolResults) {
   *       await this.onToolStepFinish(sessionId, tenantId, domain, specialistName, tr);
   *     }
   *   }
   */
  async onToolStepFinish(
    sessionId: string,
    tenantId: string,
    domain: string,
    specialistName: string,
    toolResult: any,
  ): Promise<void> {
    const decision = this.toolGuardrails.afterCall(sessionId, toolResult);

    if (decision.action === 'warn') {
      this.logger.warn(
        `[ToolGuardrails] session=${sessionId} code=${decision.code}: ${decision.message}`,
      );
      return;
    }

    if (decision.action === 'halt') {
      this.logger.error(
        `[ToolGuardrails] HALT session=${sessionId} code=${decision.code}: ${decision.message}`,
      );

      const toolName: string = toolResult?.toolName ?? 'unknown_tool';

      const jobData: EpisodeJobData = {
        tenantId,
        domain,
        ownerType: 'agent',
        ownerId: specialistName,
        episodeType: 'repair',
        keywords: ['tool_loop', toolName],
        summary: `Tool loop halted: ${decision.message}`,
      };

      await this.brainMemoryQueue.add('learn', jobData);

      // Throwing ToolLoopError breaks the AI step loop cleanly
      throw new ToolLoopError(`Tool loop halted: ${decision.message}`);
    }
  }

  /**
   * Call this after every session ends (success or halt) to free guardrail memory.
   */
  clearGuardrailSession(sessionId: string): void {
    this.toolGuardrails.clearSession(sessionId);
  }
}
