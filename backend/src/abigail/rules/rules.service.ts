import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RulesFileService } from './rules-file.service';

export interface CodingRule {
  rule_id: string;
  domain: string;
  trigger: string;
  action: string;
  skip_specialist: boolean;
}

export interface RuleMatch {
  ruleId: string;
  action: string;
  skipSpecialist: boolean;
}

@Injectable()
export class RulesService implements OnModuleInit {
  private readonly logger = new Logger(RulesService.name);
  private readonly _cache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  constructor(private readonly rulesFileService: RulesFileService) {}

  async onModuleInit() {
    await fs.mkdir(path.join(process.cwd(), 'memory', 'projects'), {
      recursive: true,
    });
  }

  private getCached<T>(key: string): T | null {
    const entry = this._cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T, ttlMs: number): void {
    this._cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private rulesPath(projectId: string): string {
    return path.join(
      process.cwd(),
      'memory',
      'projects',
      `${projectId}-rules.tsv`,
    );
  }

  async evaluate(
    message: string,
    projectId: string,
  ): Promise<RuleMatch | null> {
    const tsvRules = await this.loadRules(projectId);
    const fileRules = await this.rulesFileService.scanRuleFiles();
    const allRules = [...fileRules, ...tsvRules];

    const lowerMsg = message.toLowerCase();

    for (const rule of allRules) {
      const triggered =
        rule.trigger === 'always' ||
        lowerMsg.includes(rule.trigger.toLowerCase());

      if (triggered) {
        return {
          ruleId: rule.rule_id,
          action: rule.action,
          skipSpecialist: rule.skip_specialist,
        };
      }
    }
    return null;
  }

  private async loadRules(projectId: string): Promise<CodingRule[]> {
    const cached = this.getCached<CodingRule[]>(projectId);
    if (cached) return cached;

    const filePath = this.rulesPath(projectId);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const lines = raw
        .split('\n')
        .filter((l) => l && !l.startsWith('rule_id'));
      const rules = lines.map((line) => {
        const [rule_id, domain, trigger, action, skip_specialist] =
          line.split('\t');
        return {
          rule_id,
          domain,
          trigger,
          action,
          skip_specialist: skip_specialist?.trim() === 'true',
        };
      });
      this.setCached(projectId, rules, 5 * 60 * 1000); // 5 min TTL
      return rules;
    } catch (err) {
      this.logger.warn(
        `Could not load rules for project ${projectId}: ${(err as Error).message}`,
      );
      // Negative-cache the fallback: without this, a missing rules file is
      // re-read from disk (and re-logged) on every evaluate() call — the
      // canvas-run loop turns that into a per-task I/O + log storm.
      const fallback = this.defaultRules();
      this.setCached(projectId, fallback, 5 * 60 * 1000);
      return fallback;
    }
  }

  private defaultRules(): CodingRule[] {
    return [
      {
        rule_id: 'R001',
        domain: 'typescript',
        trigger: 'no any type',
        action: 'Use unknown instead of any in TypeScript',
        skip_specialist: true,
      },
      {
        rule_id: 'R002',
        domain: 'git',
        trigger: 'commit message',
        action: 'Format: type(scope): short description',
        skip_specialist: true,
      },
      {
        rule_id: 'R003',
        domain: 'security',
        trigger: 'password in code',
        action: 'Never hardcode secrets — use environment variables',
        skip_specialist: true,
      },
      {
        rule_id: 'R004',
        domain: 'review',
        trigger: 'always',
        action: 'assign_kai',
        skip_specialist: false,
      },
    ];
  }
}
