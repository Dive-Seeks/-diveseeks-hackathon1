import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * TenantContext — injected into USER.md for tenant-scoped agents.
 */
export interface TenantContext {
  tenantId: string;
  businessName: string;
  businessType?: string;
  cuisineType?: string;
  location?: string;
  preferences?: Record<string, any>;
  injectedWeights?: string[];
}

/**
 * SoulEngine — OpenClaw pattern.
 *
 * Reads and assembles soul workspace files (SOUL.md, IDENTITY.md, AGENTS.md,
 * TOOLS.md, MEMORY.md, USER.md, HEARTBEAT.md) for a given agent role/domain
 * before every heartbeat run.
 *
 * Soul files are plain text, version-controlled, and loaded from:
 *   backend/src/agents/souls/{agentPath}/
 *
 * The assembled string is injected first in Step 3 (Context Injection)
 * of the heartbeat dispatch loop — it is the agent's identity layer.
 */
@Injectable()
export class SoulEngine {
  private readonly logger = new Logger(SoulEngine.name);
  private readonly soulsBasePath: string;

  /** Cache assembled souls for the lifetime of the process */
  private readonly cache = new Map<string, string>();

  constructor() {
    // Resolve the souls directory relative to the project root
    this.soulsBasePath = path.resolve(__dirname, '..', '..', 'agents', 'souls');
  }

  /**
   * Assemble the full soul prompt for an agent.
   *
   * @param agentPath - path inside souls/ (e.g. 'jos', 'specialists/menu', 'managers/marketing')
   * @param tenantContext - optional tenant context for USER.md interpolation
   * @param includeHeartbeat - whether to include HEARTBEAT.md
   * @returns Assembled soul string ready for prompt injection
   */
  async assemble(
    agentPath: string,
    tenantContext?: TenantContext,
    includeHeartbeat = false,
    skillsText = '',
    pluginsText = '',
  ): Promise<string> {
    const cacheKey = `${agentPath}:${tenantContext?.tenantId ?? 'global'}:${includeHeartbeat}:${skillsText.length}:${pluginsText.length}`;

    // Don't cache tenant-scoped assemblies (USER.md varies)
    if (!tenantContext && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const files = [
      'SOUL.md',
      'IDENTITY.md',
      'AGENTS.md',
      'TOOLS.md',
      'MEMORY.md',
    ];

    if (tenantContext) {
      files.push('USER.md');
    }

    if (includeHeartbeat) {
      files.push('HEARTBEAT.md');
    }

    const parts = await Promise.all(
      files.map((f) => this.readSoulFile(agentPath, f)),
    );

    // Interpolate tenant context into USER.md (last file before HEARTBEAT)
    if (tenantContext) {
      const userIdx = files.indexOf('USER.md');
      if (userIdx !== -1 && parts[userIdx]) {
        parts[userIdx] = this.interpolateTenantContext(
          parts[userIdx],
          tenantContext,
        );
      }
    }

    if (skillsText) {
      parts.push(skillsText);
    }
    if (pluginsText) {
      parts.push(pluginsText);
    }

    const assembled = parts.filter(Boolean).join('\n\n---\n\n');

    // Cache global assemblies
    if (!tenantContext) {
      this.cache.set(cacheKey, assembled);
    }

    this.logger.debug(
      `Soul assembled for ${agentPath}: ${assembled.length} chars, ${files.length} files`,
    );

    return assembled;
  }

  /**
   * Read a single soul file from the filesystem.
   * Returns empty string if file doesn't exist (graceful degradation).
   */
  private async readSoulFile(
    agentPath: string,
    filename: string,
  ): Promise<string> {
    const filePath = path.join(this.soulsBasePath, agentPath, filename);

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8').trim();
      }
    } catch (err) {
      this.logger.warn(`Failed to read soul file ${filePath}: ${err.message}`);
    }

    return '';
  }

  /**
   * Interpolate tenant-specific placeholders in USER.md.
   */
  private interpolateTenantContext(
    content: string,
    ctx: TenantContext,
  ): string {
    // Agent-team runs have no business profile — fall back to neutral wording,
    // never the string "undefined" (models echo it into their output).
    return content
      .replace(/\[TENANT_NAME\]/g, ctx.businessName ?? "the user's workspace")
      .replace(/\[TENANT_ID\]/g, ctx.tenantId ?? 'unknown')
      .replace(/\[BUSINESS_TYPE\]/g, ctx.businessType ?? 'business')
      .replace(/\[CUISINE_TYPE\]/g, ctx.cuisineType ?? 'general')
      .replace(/\[LOCATION\]/g, ctx.location ?? 'unknown');
  }

  /**
   * Resolve the soul path for a given agent role + domain.
   *
   * Role → Path mapping:
   *   ceo            → 'jos'
   *   coordinator    → 'abigail'
   *   specialist     → 'specialists/{domain}'
   *   manager        → 'managers/{domain}'
   *   night-team     → 'night-team/{domain}'
   */
  resolveSoulPath(role: string, domain?: string): string {
    switch (role) {
      case 'ceo':
        return 'jos';
      case 'coordinator':
        return 'abigail';
      case 'evolve-agent':
        return 'abigail-soul';
      case 'specialist':
        return `specialists/${domain ?? 'general'}`;
      case 'manager':
        return `managers/${domain ?? 'general'}`;
      case 'night-team':
        return `night-team/${domain ?? 'general'}`;
      default:
        this.logger.warn(`Unknown agent role: ${role}, using generic path`);
        return `generic/${role}`;
    }
  }

  /** Clear the assembly cache (for testing or reloading soul files) */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Soul assembly cache cleared');
  }
}
