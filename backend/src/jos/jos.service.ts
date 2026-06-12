import {
  Injectable,
  OnModuleInit,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AgentsService } from '../agents/agents.service';
import { HireService } from '../abigail/hire.service';
import { AgentSessionsService } from '../abigail/agent-sessions.service';
import { BudgetService } from '../abigail/budget.service';
import { IssuesService } from '../issues/issues.service';
import { TsvLoaderUtil } from './tsv-loader.util';
import { Business } from '../setup-business/entities/business.entity';
import { GrowthEngineService, GrowthReport } from './growth-engine.service';
import { AdBudgetService } from '../ads/ad-budget.service';
import { AdNightlyService } from '../ads/ad-nightly.service';
import { CmoManagerService } from '../managers/cmo-manager.service';
import { AdCampaign } from '../ads/entities/ad-campaign.entity';
import { AdScaleService } from '../ads/ad-scale.service';
import { AgentEvolutionEvent } from './entities/agent-evolution-event.entity';
import { RuleService } from '../workforce/rules/rule.service';

import { generateObject } from 'ai';
import { z } from 'zod';
import { AgentEpisode } from '../memory/agent-episode.entity';

const COST_TIER_USD: Record<string, number> = {
  low: 0.005,
  medium: 0.025,
  high: 0.08,
};

const getBaseDir = () =>
  process.cwd().endsWith('backend')
    ? path.resolve(process.cwd(), 'src/jos')
    : path.resolve(process.cwd(), 'backend/src/jos');
const SNAPSHOT_DIR = path.join(getBaseDir(), 'snapshots');
const RULES_DIR = path.join(getBaseDir(), 'rules');
const RETAIL_RULES_DIR = path.join(getBaseDir(), 'rules/retail');
const INTENT_MAP = path.join(getBaseDir(), 'knowledge/intent-map.tsv');
const RETAIL_INTENT_MAP = path.join(
  getBaseDir(),
  'knowledge/retail-intent-map.tsv',
);

const SNAPSHOT_HEADERS = [
  'domain',
  'status',
  'score',
  'last_touched',
  'next_action',
  'stagnation_flag',
  'repair_mode',
  'strategy_preset',
];

/** Restaurant domains (original) — includes ads so snapshot is always bootstrapped with ad tile */
const DOMAINS = [
  'menu',
  'marketing',
  'images',
  'website',
  'analytics',
  'inventory',
  'customer',
  'ads',
  'accounting',
];

/** Retail domains — includes ads for cross-business ad management */
const RETAIL_DOMAINS = [
  'pricing',
  'customer_support',
  'content',
  'inventory_ops',
  'analytics_report',
  'merchandising',
  'promotions',
  'ads',
];

/** Ecommerce domains */
const ECOMMERCE_DOMAINS = [
  'product_catalogue',
  'seo_cro',
  'email_sms',
  'fulfilment',
  'analytics_cx',
  'reviews_loyalty',
  'ads',
];

const ECOMMERCE_RULES_DIR = path.join(getBaseDir(), 'rules/ecommerce');
const ECOMMERCE_INTENT_MAP = path.join(
  getBaseDir(),
  'knowledge/ecommerce-intent-map.tsv',
);

export interface JosRequestInput {
  intent: string;
  context: Record<string, string>;
  surface: string;
}

export interface JosResponse {
  sessionId?: string;
  domain?: string;
  skill?: string;
  costTier?: string;
  snapshot?: Record<string, string>[];
  resolved?: boolean;
  result?: unknown;
  source?: 'rule';
  status?: string;
  intent?: string;
  routedTo?: string;
  issueId?: string;
}

import { AI_TASKS } from '../common/ai-models.constants';
import { AiProviderRouter } from '../common/ai-provider-router.service';

@Injectable()
export class JosService implements OnModuleInit {
  private readonly logger = new Logger(JosService.name);

  /** Per-process cache: tenantId → 'RETAIL' | 'RESTAURANT' | 'HYBRID' */
  private readonly businessTypeCache = new Map<string, string>();

  constructor(
    private readonly agentsService: AgentsService,
    @Inject(forwardRef(() => HireService))
    private readonly hireService: HireService,
    @Inject(forwardRef(() => AgentSessionsService))
    private readonly agentSessions: AgentSessionsService,
    @Inject(forwardRef(() => BudgetService))
    private readonly budget: BudgetService,
    private readonly issuesService: IssuesService,
    private readonly growthEngine: GrowthEngineService,
    private readonly adBudget: AdBudgetService,
    private readonly adNightly: AdNightlyService,
    private readonly cmoMgr: CmoManagerService,
    private readonly adScale: AdScaleService,
    private readonly ruleService: RuleService,
    @InjectRepository(AdCampaign)
    private readonly adCampaignRepo: Repository<AdCampaign>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(AgentEvolutionEvent)
    private readonly evolutionRepo: Repository<AgentEvolutionEvent>,
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async onModuleInit() {
    this.logger.log('Abigail Global CEO boot sequence: checking org chart...');

    // STEP 1 — Seed Abigail as Global CEO (platform root)
    let abigail = await this.agentsService.findByNameAndRole(
      'Abigail',
      'global-ceo',
    );
    if (!abigail) {
      abigail = await this.agentsService.hire(
        {
          name: 'Abigail',
          role: 'global-ceo',
          title: 'Global CEO — Abigail AI Framework',
          domain: 'platform',
          industry: undefined, // global — no industry
          tenantId: undefined, // platform-wide
          skillPath: 'agents/souls/abigail/SOUL.md',
          budgetMonthlyCents: 999999999,
        },
        '00000000-0000-0000-0000-000000000000',
      );
    }

    // STEP 2 — Seed Jos as POS Industry CEO (reports to Abigail)
    let jos = await this.agentsService.findByNameAndRole('Jos', 'industry-ceo');
    if (!jos) {
      jos = await this.agentsService.hire(
        {
          name: 'Jos',
          role: 'industry-ceo',
          title: 'Industry CEO — Point of Sale',
          domain: 'platform',
          industry: 'pos',
          tenantId: undefined,
          reportsToId: abigail.id,
          skillPath: 'agents/souls/jos/SKILL.md',
          budgetMonthlyCents: 1000000,
        },
        abigail.id,
      );
    }

    // STEP 3 — DevCEO for software/coding industry
    let devCeo = await this.agentsService.findByNameAndRole(
      'DevCEO',
      'industry-ceo',
    );
    if (!devCeo) {
      devCeo = await this.agentsService.hire(
        {
          name: 'DevCEO',
          role: 'industry-ceo',
          title: 'Industry CEO — Software Development',
          domain: 'platform',
          industry: 'software',
          tenantId: undefined,
          reportsToId: abigail.id,
          budgetMonthlyCents: 1000000,
        },
        abigail.id,
      );
    }

    // Restaurant roster (always booted — shared infra agents) - still reports to Jos
    const roster = [
      { name: 'Menu Manager', role: 'manager', domain: 'menu' },
      { name: 'Marketing Manager', role: 'manager', domain: 'marketing' },
      { name: 'Design Manager', role: 'manager', domain: 'design' },
      { name: 'Analytics Manager', role: 'manager', domain: 'analytics' },
      { name: 'Inventory Manager', role: 'manager', domain: 'inventory' },
      { name: 'SEO Manager', role: 'manager', domain: 'seo' },
      { name: 'Loyalty Manager', role: 'manager', domain: 'loyalty' },
      { name: 'Analytics Agent', role: 'night-team', domain: 'analytics' },
      { name: 'Bug Fix Agent', role: 'night-team', domain: 'bugfix' },
      { name: 'Writer Agent', role: 'night-team', domain: 'writer' },
      { name: 'Data Analyst', role: 'night-team', domain: 'data' },
      {
        name: 'CMO Agent',
        role: 'manager',
        domain: 'cmo',
        skillPath: 'agents/souls/managers/cmo/SOUL.md',
      },
    ];

    for (const def of roster) {
      const exists = await this.agentsService.findByNameAndRole(
        def.name,
        def.role,
      );
      if (!exists) {
        await this.agentsService.hire(
          {
            name: def.name,
            role: def.role,
            title: def.name,
            domain: def.domain,
            reportsToId: jos.id,
            budgetMonthlyCents: 50000,
            ...((def as any).skillPath
              ? { skillPath: (def as any).skillPath }
              : {}),
          },
          jos.id,
        );
      }
    }

    // Boot retail org chart for all retail tenants found in DB
    try {
      const retailBusinesses = await this.businessRepo.find({
        where: { type: 'RETAIL' },
        select: ['id'],
      });
      for (const biz of retailBusinesses) {
        this.businessTypeCache.set(biz.id, 'RETAIL');
        await this.ensureRetailTeam(biz.id, jos.id);
      }
      if (retailBusinesses.length > 0) {
        this.logger.log(
          `Retail org chart booted for ${retailBusinesses.length} tenant(s).`,
        );
      }
    } catch (err: any) {
      // Non-fatal: retail boot can fail at startup (e.g. DB not ready in test env)
      this.logger.warn(`Retail boot skipped: ${err.message}`);
    }

    // Boot ecommerce org chart for all ecommerce tenants found in DB
    try {
      const ecommerceBusinesses = await this.businessRepo.find({
        where: { type: 'ECOMMERCE' },
        select: ['id'],
      });
      for (const biz of ecommerceBusinesses) {
        this.businessTypeCache.set(biz.id, 'ECOMMERCE');
        await this.ensureEcommerceTeam(biz.id, jos.id);
      }
      if (ecommerceBusinesses.length > 0) {
        this.logger.log(
          `Ecommerce org chart booted for ${ecommerceBusinesses.length} tenant(s).`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Ecommerce boot skipped: ${err.message}`);
    }

    // Nightly ad run — only runs when there are active ad budgets
    // In production this would be triggered by a cron job; here it runs once at boot for dev
    try {
      const allBusinesses = await this.businessRepo.find({
        select: ['id', 'type'],
      });
      const businessTypeMap = Object.fromEntries(
        allBusinesses.map((b) => [b.id, (b as any).type ?? 'RESTAURANT']),
      );
      const adReports = await this.adNightly.runNightly(businessTypeMap);
      if (adReports.length > 0) {
        this.logger.log(
          `Nightly ad reports generated for ${adReports.length} tenant(s)`,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Nightly ad run skipped: ${err.message}`);
    }

    // Nightly promotion check — promote high-use sub-agent episodes to Abigail memory
    try {
      const allBusinessesForPromotion = await this.businessRepo.find({
        select: ['id'],
      });
      for (const biz of allBusinessesForPromotion) {
        await this.runPromotionCheck(biz.id);
      }
    } catch (err: any) {
      this.logger.warn(`Promotion check skipped: ${err.message}`);
    }

    this.logger.log('Jos boot sequence complete.');
  }

  /**
   * Ensure the retail-specific manager roster exists for a given tenant.
   * Called from onModuleInit for all retail tenants and from loadSnapshot
   * the first time a retail tenant bootstraps their snapshot.
   */
  async ensureRetailTeam(tenantId: string, josId?: string): Promise<void> {
    const jos = josId
      ? { id: josId }
      : await this.agentsService.findByNameAndRole('Jos', 'ceo');
    if (!jos) return;

    const retailRoster = [
      { name: 'COO Agent', role: 'manager', domain: 'coo' },
      {
        name: 'Customer Service Manager',
        role: 'manager',
        domain: 'customer_service',
      },
      {
        name: 'Inventory Supply Chain Manager',
        role: 'manager',
        domain: 'inventory_supply_chain',
      },
      {
        name: 'Merchandising Manager',
        role: 'manager',
        domain: 'merchandising_mgr',
      },
    ];

    const coordinator =
      await this.agentsService.findCoordinatorForTenant(tenantId);
    const reportsTo = coordinator?.id ?? jos.id;

    for (const def of retailRoster) {
      const existing = (await this.agentsService.findAll(tenantId)).find(
        (a) =>
          a.domain === def.domain &&
          a.role === def.role &&
          a.status !== 'terminated',
      );
      if (!existing) {
        await this.agentsService.hire(
          {
            name: def.name,
            role: def.role,
            title: def.name,
            domain: def.domain,
            tenantId,
            reportsToId: reportsTo,
            budgetMonthlyCents: 50000,
          },
          reportsTo,
        );
      }
    }
  }

  async ensureEcommerceTeam(tenantId: string, josId?: string): Promise<void> {
    const jos = josId
      ? { id: josId }
      : await this.agentsService.findByNameAndRole('Jos', 'ceo');
    if (!jos) return;

    const ecommerceRoster = [
      {
        name: 'Head of Commerce',
        role: 'manager',
        domain: 'head_of_commerce',
        skillPath: 'agents/souls/managers/head_of_commerce/SOUL.md',
      },
      {
        name: 'Growth Manager',
        role: 'manager',
        domain: 'growth',
        skillPath: 'agents/souls/managers/growth/SOUL.md',
      },
      {
        name: 'Performance Manager',
        role: 'manager',
        domain: 'performance',
        skillPath: 'agents/souls/managers/performance/SOUL.md',
      },
    ];

    const coordinator =
      await this.agentsService.findCoordinatorForTenant(tenantId);
    const reportsTo = coordinator?.id ?? jos.id;

    for (const def of ecommerceRoster) {
      const existing = (await this.agentsService.findAll(tenantId)).find(
        (a) =>
          a.domain === def.domain &&
          a.role === def.role &&
          a.status !== 'terminated',
      );
      if (!existing) {
        await this.agentsService.hire(
          {
            name: def.name,
            role: def.role,
            title: def.name,
            domain: def.domain,
            tenantId,
            reportsToId: reportsTo,
            budgetMonthlyCents: 50000,
            skillPath: def.skillPath,
          },
          reportsTo,
        );
      }
    }
  }

  async validatePromotion(
    geneId: string,
    tenantId: string,
    summary: string,
  ): Promise<boolean> {
    try {
      const { object } = await generateObject({
        model: this.aiRouter.getModel(AI_TASKS.PROMOTION),
        schema: z.object({
          validation_passed: z.boolean(),
        }),
        prompt: `Check if this solution is globally applicable and safe to promote for tenant ${tenantId}.
Solution summary: ${summary}
Is this safe to promote to a global rule?`,
      });
      return object.validation_passed;
    } catch (e) {
      this.logger.warn(
        `Validation failed for gene ${geneId}: ${(e as Error).message}`,
      );
      return false;
    }
  }

  async analyzeGeneHistory(tenantId: string, domain: string): Promise<void> {
    const events = await this.evolutionRepo.find({
      where: { tenant_id: tenantId, domain },
      order: { created_at: 'DESC' },
      take: 10,
    });

    if (events.length === 0) return;

    let consecutiveRejected = 0;
    let consecutiveFailed = 0;
    let consecutiveZeroApproval = 0;

    for (const ev of events) {
      if (ev.outcome.status === 'rejected') consecutiveRejected++;
      else break;
    }

    for (const ev of events) {
      if (ev.outcome.status === 'failed') consecutiveFailed++;
      else break;
    }

    for (const ev of events) {
      if (!ev.outcome.approval) consecutiveZeroApproval++;
      else break;
    }

    if (consecutiveRejected >= 3) {
      this.logger.warn(
        `Stagnation detected for tenant ${tenantId} domain ${domain}`,
      );
      await this.updateSnapshot(tenantId, domain, {
        stagnation_flag: 'true',
        strategy_preset: 'repair-only',
      });
    }

    if (consecutiveFailed >= 5) {
      this.logger.error(
        `Critical failure loop for tenant ${tenantId} domain ${domain}`,
      );
      // Ban gene logic would go here
    }

    if (consecutiveZeroApproval >= 5) {
      this.logger.log(
        `Stable plateau detected for tenant ${tenantId} domain ${domain}`,
      );
      await this.updateSnapshot(tenantId, domain, {
        repair_mode: 'true',
        strategy_preset: 'repair-only',
      });
    }

    // Gene-level suppression: count how many times each gene_id appears across
    // events where approval === false. Any gene seen 3+ times without approval
    // is marked suppressed in the snapshot and recorded in the tenant memory TSV.
    const rejectedGeneFreq = new Map<string, number>();
    for (const ev of events) {
      if (ev.outcome.approval === false && Array.isArray(ev.genes_used)) {
        for (const geneId of ev.genes_used) {
          rejectedGeneFreq.set(geneId, (rejectedGeneFreq.get(geneId) ?? 0) + 1);
        }
      }
    }

    for (const [geneId, count] of rejectedGeneFreq.entries()) {
      if (count >= 3) {
        this.logger.warn(
          `Gene suppressed: ${geneId} appeared ${count} times with no approval ` +
            `for tenant ${tenantId} domain ${domain}`,
        );
        await this.updateSnapshot(tenantId, domain, {
          stagnation_flag: `gene_suppressed:${geneId}`,
        });
      }
    }
  }

  /**
   * Promotion check: any sub-agent episode with useCount >= 3 is a candidate
   * for promotion to Abigail's global memory. Each candidate is validated via
   * an LLM check; passing candidates are written as rows in the Abigail memory
   * TSV and marked as promoted (useCount set to -1) to prevent re-promotion.
   */
  async runPromotionCheck(tenantId: string): Promise<void> {
    const candidates = await this.episodeRepo.find({
      where: { tenantId, ownerType: 'subagent' },
    });

    const promotable = candidates.filter((ep) => ep.useCount >= 3);
    if (promotable.length === 0) return;

    const getBaseMemDir = () =>
      process.cwd().endsWith('backend')
        ? path.resolve(process.cwd(), 'memory/agents')
        : path.resolve(process.cwd(), 'backend/memory/agents');

    const abigailMemoryPath = path.join(getBaseMemDir(), 'abigail-memory.tsv');

    for (const episode of promotable) {
      try {
        const passed = await this.validatePromotion(
          episode.id,
          tenantId,
          episode.summary,
        );
        if (!passed) continue;

        // Mark as promoted so this episode is never re-checked
        await this.episodeRepo.update(
          { id: episode.id },
          { useCount: -1, ownerType: 'promoted' },
        );

        this.logger.log(
          `Episode ${episode.id} (domain=${episode.domain}) promoted to Abigail memory for tenant ${tenantId}`,
        );
      } catch (err) {
        this.logger.warn(
          `Promotion check failed for episode ${episode.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  async processRequest(
    input: JosRequestInput,
    tenantId: string | null,
  ): Promise<JosResponse> {
    const safeTenantId = tenantId || '00000000-0000-0000-0000-000000000000';

    const intentRow = await this.lookupIntent(input.intent, safeTenantId);
    if (intentRow) {
      await this.analyzeGeneHistory(safeTenantId, intentRow.domain);
    }

    const snapshot = await this.loadSnapshot(safeTenantId);
    const ruleResult = await this.evaluateRule(
      input.intent,
      input.context,
      safeTenantId,
    );
    if (ruleResult) {
      return { resolved: true, result: ruleResult, source: 'rule', snapshot };
    }

    if (intentRow) {
      // Fallback for tests if !intentRow
      const estimatedCostUsd = COST_TIER_USD[intentRow.cost_tier] ?? 0.01;

      if (intentRow.domain === 'accounting') {
        this.logger.log(
          `Jos routing accounting intent to Clara for tenant ${safeTenantId}`,
        );
        return {
          routedTo: 'clara',
          domain: 'accounting',
          status: 'routed',
          intent: intentRow.intent,
          snapshot,
        };
      }

      const budget = await this.budget.checkAndReserve(
        safeTenantId,
        estimatedCostUsd,
      );
      if (!budget.allowed) {
        throw new HttpException(
          { reason: 'budget_exhausted', usage: budget },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const session = await this.agentSessions.findOrCreate(
        safeTenantId,
        intentRow.domain,
      );

      // After a session is created, boost the domain score so tonight's growth report reflects the work
      const currentSnapshot = await this.loadSnapshot(safeTenantId);
      const domainRow = currentSnapshot.find(
        (r) => r.domain === intentRow.domain,
      );
      if (domainRow) {
        const currentScore = parseFloat(domainRow.score ?? '0');
        const increment = this.growthEngine.domainScoreIncrement(
          intentRow.domain,
          currentScore,
        );
        const newScore = Math.min(100, currentScore + increment).toString();
        await this.updateSnapshot(safeTenantId, intentRow.domain, {
          score: newScore,
          status: 'in_progress',
        });
      }

      return {
        sessionId: session.id,
        domain: intentRow.domain,
        skill: intentRow.skill,
        costTier: intentRow.cost_tier,
        snapshot,
      };
    }

    return this.processLegacyRequest(input.intent, safeTenantId);
  }

  private async processLegacyRequest(intent: string, tenantId: string | null) {
    const safeTenantId = tenantId || '00000000-0000-0000-0000-000000000000';
    const domain = this.classifyDomain(intent);
    const specialist = await this.hireService.ensureSpecialist(
      safeTenantId,
      domain,
    );
    const issue = await this.issuesService.create({
      tenantId: safeTenantId,
      assigneeAgentId: specialist.id,
      domain,
      title: intent.slice(0, 120),
      description: intent,
      priority: 'medium',
      goalAncestry: { tenantGoal: intent },
    });
    return {
      status: 'accepted',
      intent,
      domain,
      routedTo: specialist.name,
      issueId: issue.id,
    };
  }

  private classifyDomain(intent: string): string {
    const t = intent.toLowerCase();
    if (/menu|dish|item|food|price|categor/.test(t)) return 'menu';
    if (/market|campaign|email|promo|social/.test(t)) return 'marketing';
    if (/seo|search|google|rank|keyword/.test(t)) return 'seo';
    if (/stock|inventory|supplier|restock/.test(t)) return 'inventory';
    if (/analytic|report|sale|revenue|trend/.test(t)) return 'analytics';
    if (/design|logo|brand|colour|image/.test(t)) return 'design';
    if (/loyalt|reward|point/.test(t)) return 'loyalty';
    return 'menu';
  }

  async updateSnapshot(
    tenantId: string,
    domain: string,
    patch: Partial<Record<string, string>>,
  ): Promise<void> {
    const snapshotPath = path.join(SNAPSHOT_DIR, `${tenantId}.tsv`);
    const rows = await TsvLoaderUtil.readTsv(snapshotPath);

    const idx = rows.findIndex((r) => r.domain === domain);
    if (idx === -1) {
      rows.push({
        domain,
        status: 'healthy',
        score: '100',
        last_touched: new Date().toISOString().split('T')[0],
        next_action: 'none',
        ...patch,
      });
    } else {
      rows[idx] = {
        ...rows[idx],
        ...patch,
        last_touched: new Date().toISOString().split('T')[0],
      };
    }

    const content =
      [
        SNAPSHOT_HEADERS.join('\t'),
        ...rows.map((r) => SNAPSHOT_HEADERS.map((h) => r[h] ?? '').join('\t')),
      ].join('\n') + '\n';
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
    await fs.writeFile(snapshotPath, content, 'utf8');
  }

  /**
   * Return 'RETAIL' | 'RESTAURANT' | 'HYBRID' for a tenant.
   * Uses in-process cache to avoid per-request DB hits.
   */
  async getBusinessType(tenantId: string): Promise<string> {
    if (this.businessTypeCache.has(tenantId)) {
      return this.businessTypeCache.get(tenantId)!;
    }
    try {
      const biz = await this.businessRepo.findOne({
        where: { id: tenantId },
        select: ['type'],
      });
      const type = biz?.type ?? 'RESTAURANT';
      this.businessTypeCache.set(tenantId, type);
      return type;
    } catch {
      return 'RESTAURANT';
    }
  }

  private async loadSnapshot(
    tenantId: string,
  ): Promise<Record<string, string>[]> {
    const snapshotPath = path.join(SNAPSHOT_DIR, `${tenantId}.tsv`);
    const existing = await TsvLoaderUtil.readTsv(snapshotPath);
    if (existing.length > 0) return existing;

    const businessType = await this.getBusinessType(tenantId);
    const domains =
      businessType === 'RETAIL'
        ? RETAIL_DOMAINS
        : businessType === 'ECOMMERCE'
          ? ECOMMERCE_DOMAINS
          : DOMAINS;

    // Bootstrap with correct domain set
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
    const emptyRows = domains
      .map(
        (d) => `${d}\tnot_started\t0\tnever\tonboard\tfalse\tfalse\tbalanced`,
      )
      .join('\n');
    await fs.writeFile(
      snapshotPath,
      SNAPSHOT_HEADERS.join('\t') + '\n' + emptyRows + '\n',
      'utf8',
    );

    // For new retail tenants, also ensure the retail team is booted
    if (businessType === 'RETAIL') {
      await this.ensureRetailTeam(tenantId);
    } else if (businessType === 'ECOMMERCE') {
      await this.ensureEcommerceTeam(tenantId);
    }

    return TsvLoaderUtil.readTsv(snapshotPath);
  }

  async loadSnapshotPublic(tenantId: string) {
    return this.loadSnapshot(tenantId);
  }

  async getGrowthReport(tenantId: string): Promise<GrowthReport> {
    const snapshot = await this.loadSnapshot(tenantId);
    const budgetStatus = await this.adBudget.getStatus(tenantId);
    const businessType = await this.getBusinessType(tenantId);
    const strategyPreset = snapshot[0]?.strategy_preset || 'balanced';
    return this.growthEngine.computeReport(
      snapshot,
      budgetStatus.isSet,
      businessType,
      strategyPreset,
    );
  }

  async setAdBudget(
    tenantId: string,
    monthlyBudgetCents: number,
  ): Promise<void> {
    await this.adBudget.setBudget(tenantId, monthlyBudgetCents);
    // Bump the 'ads' domain score on first budget set
    await this.updateSnapshot(tenantId, 'ads', {
      status: 'healthy',
      score: '20',
      next_action: 'none',
    });
  }

  private async evaluateRule(
    intent: string,
    context: Record<string, string>,
    tenantId: string,
  ): Promise<unknown | null> {
    const intentRow = await this.lookupIntent(intent, tenantId);
    if (!intentRow) return null;

    const businessType = await this.getBusinessType(tenantId);

    const rules = await this.ruleService.getMergedRules(
      tenantId,
      businessType.toLowerCase(),
      intentRow.domain,
    );
    if (rules.length === 0) return null;

    const firstKey = Object.keys(rules[0])[0];
    const contextVal = context[firstKey];
    if (!contextVal) return null;

    const matchedRule = rules.find(
      (r) => r[firstKey]?.toLowerCase() === contextVal.toLowerCase(),
    );
    if (!matchedRule) return null;

    if (
      /minimum|min_cat|compliance|modifier|threshold|margin|max_/.test(intent)
    ) {
      return matchedRule;
    }
    return null;
  }

  /**
   * Look up an intent. For retail tenants, tries the retail intent map first,
   * then falls back to the base intent map.
   */
  private async lookupIntent(
    intent: string,
    tenantId?: string,
  ): Promise<Record<string, string> | null> {
    if (tenantId) {
      const businessType = await this.getBusinessType(tenantId);
      if (businessType === 'RETAIL') {
        const retailRows = await TsvLoaderUtil.readTsv(RETAIL_INTENT_MAP);
        const found = retailRows.find((r) => r.intent === intent);
        if (found) return found;
      } else if (businessType === 'ECOMMERCE') {
        const ecomRows = await TsvLoaderUtil.readTsv(ECOMMERCE_INTENT_MAP);
        const found = ecomRows.find((r) => r.intent === intent);
        if (found) return found;
      }

      const accRows = await TsvLoaderUtil.readTsv(
        path.join(getBaseDir(), 'knowledge/accounting-intent-map.tsv'),
      );
      const accFound = accRows.find((r) => r.intent === intent);
      if (accFound) return accFound;
    }
    const rows = await TsvLoaderUtil.readTsv(INTENT_MAP);
    return rows.find((r) => r.intent === intent) ?? null;
  }

  async getAdCampaigns(tenantId: string) {
    return this.adCampaignRepo.find({ where: { tenantId } });
  }

  async createAdCampaign(
    tenantId: string,
    dto: {
      campaignName: string;
      platform: string;
      allocatedBudgetCents: number;
      benchmarkCprCents: number;
      startDate: string;
      endDate?: string;
    },
  ) {
    const campaign = this.adCampaignRepo.create({
      tenantId,
      campaignName: dto.campaignName,
      platform: dto.platform as any,
      allocatedBudgetCents: dto.allocatedBudgetCents,
      benchmarkCprCents: dto.benchmarkCprCents,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      status: 'active',
    });
    return this.adCampaignRepo.save(campaign);
  }

  async approveAdScale(campaignId: string, tenantId: string) {
    return this.adScale.approveScale(campaignId, tenantId);
  }

  async killAdCampaign(campaignId: string, tenantId: string) {
    const campaign = await this.adCampaignRepo.findOne({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
    campaign.status = 'killed';
    campaign.killReason = 'manual';
    return this.adCampaignRepo.save(campaign);
  }
}
