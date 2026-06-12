import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CodingRule } from './rules.service';

@Injectable()
export class RulesFileService {
  private readonly logger = new Logger(RulesFileService.name);
  private readonly rulesBasePath = path.resolve(
    process.cwd(),
    'agents',
    'rules',
  );

  async scanRuleFiles(): Promise<CodingRule[]> {
    const rules: CodingRule[] = [];
    try {
      // Check if directory exists
      try {
        await fs.access(this.rulesBasePath);
      } catch {
        return rules;
      }

      const files = await fs.readdir(this.rulesBasePath);
      const mdFiles = files.filter(
        (f) => f.endsWith('.md') && f !== 'README.md',
      );

      for (const file of mdFiles) {
        const fullPath = path.join(this.rulesBasePath, file);
        const raw = await fs.readFile(fullPath, 'utf-8');
        const rule = this.parseRuleMd(raw, file);
        if (rule) {
          rules.push(rule);
        }
      }
    } catch (e) {
      this.logger.error(`Failed to scan rule files: ${(e as Error).message}`);
    }
    return rules;
  }

  private parseRuleMd(raw: string, filename: string): CodingRule | null {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = raw.match(frontmatterRegex);

    const rule: CodingRule = {
      rule_id: filename.replace('.md', ''),
      domain: 'general',
      trigger: '',
      action: '',
      skip_specialist: false,
    };

    if (!match) {
      // If no frontmatter, it's not a valid RULE.md
      return null;
    }

    const yamlBlock = match[1];
    // Simple line-based parser for YAML-like frontmatter
    for (const line of yamlBlock.split('\n')) {
      const [key, ...rest] = line.split(':');
      if (!key || rest.length === 0) continue;
      const value = rest.join(':').trim();
      const k = key.trim();

      if (k === 'name') rule.rule_id = value;
      else if (k === 'domain') rule.domain = value;
      else if (k === 'trigger') rule.trigger = value;
      else if (k === 'action') rule.action = value;
      else if (k === 'skip_specialist') rule.skip_specialist = value === 'true';
    }

    return rule;
  }
}
