import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SkillEngineService {
  private readonly logger = new Logger(SkillEngineService.name);

  async load(domain: string): Promise<string> {
    // Try domain-specific AGENTS.md from soul workspace
    const candidates = [
      `src/agents/souls/specialists/${domain}/AGENTS.md`,
      `src/agents/souls/managers/${domain}/AGENTS.md`,
    ];

    for (const candidate of candidates) {
      const fullPath = path.resolve(process.cwd(), candidate);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8').trim();
        if (content) return `# Domain Skill\n${content}`;
      }
    }

    this.logger.warn(`No skill file found for domain: ${domain}`);
    return '';
  }
}
