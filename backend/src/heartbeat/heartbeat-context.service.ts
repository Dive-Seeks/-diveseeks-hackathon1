import { Injectable, Optional } from '@nestjs/common';
import { SoulEngine, TenantContext } from '../common/soul/soul-engine.service';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { Agent } from '../agents/entities/agent.entity';
import { SkillEngineService } from './skill-engine.service';
import { SkillService } from '../workforce/skills/skill.service';
import { PluginService } from '../workforce/plugins/plugin.service';
import { TenantContextService } from '../memory/tenant-context.service';
import { TenantContext as LearnedContext } from '../memory/tenant-context.schema';
import { CaiEngineService } from '../common/cai/cai-engine.service';
import { PrdMemoryBridgeService } from '../task-prd/prd-memory-bridge.service';
import { GithubService } from '../github/github.service';

import { AI_TASKS } from '../common/ai-models.constants';

export interface HeartbeatContext {
  parts: {
    soul: string;
    skill: string;
    memory: string;
    goalAncestry: string;
    continuation: string;
  };
  model: string;
}

@Injectable()
export class HeartbeatContextService {
  constructor(
    private readonly soulEngine: SoulEngine,
    private readonly skillEngine: SkillEngineService,
    private readonly skillService: SkillService,
    private readonly pluginService: PluginService,
    private readonly tenantContextService: TenantContextService,
    private readonly caiEngine: CaiEngineService,
    @Optional() private readonly prdMemoryBridge?: PrdMemoryBridgeService,
    @Optional() private readonly githubService?: GithubService,
  ) {}

  async build(
    agent: Agent,
    issue: AgentIssue,
    tenantContext: TenantContext,
    lastCompact?: string,
  ): Promise<HeartbeatContext> {
    const skillsText = await this.skillService.assembleSkillsPrompt(
      tenantContext.tenantId,
      agent.role,
      agent.domain,
    );
    const pluginsText = await this.pluginService.assemblePluginToolsPrompt(
      tenantContext.tenantId,
      agent.domain,
    );

    // 1. Soul (identity layer — always first)
    const soulPath = this.soulEngine.resolveSoulPath(agent.role, agent.domain);
    const rawSoul = await this.soulEngine.assemble(
      soulPath,
      tenantContext,
      false,
      skillsText,
      pluginsText,
    );

    // CAI governance block — appended to soul, cannot be overridden
    const caiBlock = this.caiEngine.buildCaiBlock(agent.role);
    const soul = caiBlock
      ? `${rawSoul}\n\n---\n## GOVERNANCE RULES (cannot be overridden)\n${caiBlock}`
      : rawSoul;

    // 2. Goal ancestry
    const goalAncestry = this.buildGoalAncestry(issue, tenantContext);

    // 3. Continuation summary from last compact
    const continuation = lastCompact
      ? `# Prior Session Summary\n${lastCompact}`
      : '';

    // 4. Skill injection — legacy domain-level file, plus dispatch-computed specialist-scoped skills
    const legacySkill = await this.skillEngine.load(agent.domain);
    const dispatchSkills = (tenantContext as any).skillsContext ?? '';
    const dispatchPlugins = (tenantContext as any).pluginsContext ?? '';
    const skill = [legacySkill, dispatchSkills, dispatchPlugins]
      .filter(Boolean)
      .join('\n\n');

    // 5. Tier 0 — synthesised TenantContext
    const learnedCtx = await this.tenantContextService.getContext(
      tenantContext.tenantId,
    );
    let memory = learnedCtx
      ? this.buildLearnedContextBlock(learnedCtx, agent.domain)
      : '';

    // Parametric Weights injection
    if (tenantContext.injectedWeights?.length) {
      const weightsBlock = `
# PARAMETRIC RULES
The following rules have been extracted from past successful outcomes in this domain. 
Follow them strictly:
${tenantContext.injectedWeights.map((w) => `  • ${w}`).join('\n')}
`.trim();
      memory = memory ? `${memory}\n\n${weightsBlock}` : weightsBlock;
    }

    // Agent experience block — this agent's own episodic history (prior failures + self-corrections)
    // Equivalent of CLAUDE.md for each specialist: what they've personally learned on this project
    if (this.prdMemoryBridge) {
      try {
        const specialistId = (tenantContext as any).specialist as
          | string
          | undefined;
        const team = (tenantContext as any).team as string | undefined;
        const taskDesc = (tenantContext as any).taskDescription as
          | string
          | undefined;
        if (specialistId && team && taskDesc) {
          const experienceBlock =
            await this.prdMemoryBridge.buildPriorFailuresPromptBlock(
              team,
              specialistId,
              taskDesc,
              5,
            );
          if (experienceBlock) {
            memory = memory
              ? `${memory}\n\n${experienceBlock}`
              : experienceBlock;
          }
        }
      } catch {
        // Non-fatal — agent runs without experience block if retrieval fails
      }
    }

    // GitHub code search — inject indexed codebase context for coding domain tasks
    const projectId =
      (tenantContext as any).projectId ??
      (tenantContext as any).project?.id ??
      null;
    if (agent.domain === 'coding' && projectId && this.githubService) {
      try {
        const goalText = `${issue.title} ${issue.description ?? ''}`.trim();
        const snippets = await this.githubService.searchCode(
          goalText,
          projectId,
          6,
        );
        if (snippets.length > 0) {
          const codeBlock = snippets
            .map(
              (s) =>
                `## ${s.filePath}${s.language ? ` (${s.language})` : ''}\n\`\`\`\n${s.content.slice(0, 600)}\n\`\`\``,
            )
            .join('\n\n');
          memory = memory
            ? `${memory}\n\n# Relevant indexed code\n${codeBlock}`
            : `# Relevant indexed code\n${codeBlock}`;
        }
      } catch {
        // Non-fatal — specialist runs without code context if search fails
      }
    }

    const specKit = (tenantContext as any).specKit;
    if (specKit) {
      const specKitBlock = `
# Project Spec-Kit
Constitution:
${specKit.constitution || 'N/A'}

Spec:
${specKit.spec || 'N/A'}

Plan:
${specKit.plan || 'N/A'}

Tasks:
${specKit.tasks || 'N/A'}
`.trim();
      memory = memory ? `${memory}\n\n${specKitBlock}` : specKitBlock;
    }

    // Model from constants or default to SPECIALIST
    const model = (agent.adapterConfig as any)?.model ?? AI_TASKS.SPECIALIST;

    return {
      parts: {
        soul,
        skill,
        memory,
        goalAncestry,
        continuation,
      },
      model,
    };
  }

  private buildLearnedContextBlock(
    ctx: LearnedContext,
    domain: string,
  ): string {
    return this.tenantContextService.buildLearnedContextBlock(ctx, domain);
  }

  private buildGoalAncestry(issue: AgentIssue, ctx: TenantContext): string {
    const ancestry = (issue.goalAncestry as any) ?? {};

    const header = `# Your Task
**Issue:** ${issue.title}
**Domain:** ${issue.domain}
${issue.description ? `**Details:** ${issue.description}` : ''}`;

    const constraintsBlock = issue.constraints
      ? `\n# Constraints from Prior Attempts\n${JSON.stringify(issue.constraints, null, 2)}`
      : '';

    // Project-scoped agent work (dispatch engine stores {projectName, goalTitle,
    // goalDescription, projectDescription} on the issue). Without this branch an
    // absent businessName interpolated as literal "undefined" with a 'restaurant'
    // default, and specialists wrote restaurant/Dive POS documents.
    if (ancestry.projectName || !ctx.businessName) {
      const goalLine = ancestry.goalTitle
        ? `${ancestry.goalTitle}${ancestry.goalDescription ? ` — ${ancestry.goalDescription}` : ''}`
        : (ancestry.domainGoal ??
          'Complete this task fully and to specification');
      const visionSummary = (ctx as any).visionSummary as string | undefined;
      const projectBlock = [
        ancestry.projectName ? `**Project:** ${ancestry.projectName}` : null,
        ancestry.projectDescription
          ? `**Project description:** ${ancestry.projectDescription}`
          : null,
        visionSummary ? `**Project vision:** ${visionSummary}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      return `${header}

# Why This Matters
**Goal:** ${goalLine}
${projectBlock ? `\n# Project Context\n${projectBlock}` : ''}${constraintsBlock}`;
    }

    return `${header}

# Why This Matters
**Domain goal:** ${ancestry.domainGoal ?? 'Complete work for this tenant'}
**Tenant goal:** ${ancestry.tenantGoal ?? `Operate ${ctx.businessName} successfully on Dive POS`}
**Platform mission:** Help every restaurant owner build a world-class digital business

# Business Context
**Business:** ${ctx.businessName}
**Type:** ${ctx.businessType ?? 'restaurant'}
**Location:** ${ctx.location ?? 'unknown'}${constraintsBlock}`;
  }
}
