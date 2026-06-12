import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RedisCacheService } from '../common/cache/redis-cache.service';

const execAsync = promisify(exec);

const CHARS_PER_TOKEN = 4;

@Injectable()
export class GitContextService {
  private readonly logger = new Logger(GitContextService.name);
  private readonly repoPath = process.env.GIT_REPO_PATH || '.';

  constructor(private readonly redisCacheService: RedisCacheService) {}

  async getContext(
    projectId: string,
    teamId: string,
    taskDescription: string,
  ): Promise<string> {
    if (process.env.GIT_CONTEXT_ENABLED === 'false') return '';

    // Redis-first: CLI-pushed context (exact key — no wildcard)
    const redisKey = `tenant:${teamId}:project:${projectId}:git-context`;
    const cached = await this.redisCacheService.get(redisKey);
    if (cached) {
      try {
        const { log, status, tree } = JSON.parse(cached as string);
        this.logger.log(
          `[GitContext] Cache HIT for project ${projectId} (tenant ${teamId})`,
        );
        const raw = this.format(log, status, tree, '');
        return this.trimToTokenBudget(raw);
      } catch (err) {
        this.logger.error(
          `Failed to parse cached git context for ${redisKey}`,
          err,
        );
      }
    }

    try {
      const { stdout: log } = await this.execGit('log --oneline -10');
      const { stdout: status } = await this.execGit('status --short');
      const { stdout: tree } = await this.execGit(
        'ls-tree -r --name-only HEAD | head -80',
      );

      const relevantFile = this.extractMentionedFile(taskDescription, tree);
      let filePreview = '';
      if (relevantFile) {
        filePreview = await this.readFileHead(relevantFile, 50);
      }

      const raw = this.format(log, status, tree, filePreview);
      return this.trimToTokenBudget(raw);
    } catch (err) {
      this.logger.warn(`Failed to get git context: ${(err as Error).message}`);
      return '';
    }
  }

  private trimToTokenBudget(text: string): string {
    const maxTokens = process.env.GIT_CONTEXT_MAX_TOKENS
      ? parseInt(process.env.GIT_CONTEXT_MAX_TOKENS)
      : 800;
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    return text.length <= maxChars ? text : text.substring(0, maxChars);
  }

  private async execGit(command: string) {
    return execAsync(`git ${command}`, { cwd: this.repoPath });
  }

  private extractMentionedFile(
    taskDescription: string,
    tree: string,
  ): string | null {
    const files = tree.split('\n').filter(Boolean);
    const desc = taskDescription.toLowerCase();
    let bestMatch: string | null = null;
    for (const file of files) {
      const fileName = path.basename(file).toLowerCase();
      if (desc.includes(fileName) || desc.includes(file.toLowerCase())) {
        if (!bestMatch || file.length > bestMatch.length) {
          bestMatch = file;
        }
      }
    }
    return bestMatch;
  }

  private async readFileHead(filePath: string, lines: number): Promise<string> {
    const fullPath = path.resolve(this.repoPath, filePath);
    if (!fs.existsSync(fullPath)) return '';
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const head = content.split('\n').slice(0, lines).join('\n');
      return `\n--- PREVIEW OF ${filePath} (First ${lines} lines) ---\n${head}\n`;
    } catch (e) {
      return '';
    }
  }

  private format(
    log: string,
    status: string,
    tree: string,
    filePreview: string,
  ): string {
    return `<codebase_context>
Recent commits:
${log}

Changed files:
${status}

Project structure (top-level):
${tree}
${filePreview}
</codebase_context>`.trim();
  }
}
