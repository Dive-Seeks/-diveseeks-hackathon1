import { Injectable, Logger } from '@nestjs/common';
import { VisionGoal } from '../vision/vision.types';
import { McpManagerService } from '../../mcp/mcp-manager.service';
import { DeepReasoningService } from '../../abigail/deep-reasoning/deep-reasoning.service';

export interface Gap {
  description: string;
  blocksOtherGoals: boolean;
  isSecurityRelated: boolean;
}

@Injectable()
export class GapAnalyzerService {
  private readonly logger = new Logger(GapAnalyzerService.name);

  constructor(
    private readonly mcpManager: McpManagerService,
    private readonly deepReasoningService: DeepReasoningService,
  ) {}

  async findGaps(
    goal: VisionGoal,
    projectContext: { githubRepo?: string; githubBranch?: string },
  ): Promise<Gap[]> {
    if (goal.status === 'complete') return [];

    const gaps: Gap[] = [];
    const isSecurityRelated =
      goal.title.toLowerCase().includes('auth') ||
      goal.title.toLowerCase().includes('security') ||
      goal.title.toLowerCase().includes('owasp');

    // Try GitHub MCP to verify what files exist
    const existingFiles = await this.listFilesViaGitHub(
      projectContext.githubRepo,
      projectContext.githubBranch,
    );

    if (existingFiles.length === 0) {
      // No GitHub MCP available — fall back to progress-based analysis
      this.logger.warn(
        `No GitHub MCP available for gap analysis — using progress fallback for goal ${goal.id}`,
      );
      gaps.push({
        description:
          goal.progress === 0
            ? `Initial implementation for: ${goal.title}`
            : `Remaining work for: ${goal.title}`,
        blocksOtherGoals: false,
        isSecurityRelated,
      });
      return gaps;
    }

    // Check which features from goal description are NOT represented in the file tree
    const goalKeywords = this.extractKeywords(goal.description);
    const missingKeywords = goalKeywords.filter(
      (keyword) =>
        !existingFiles.some((f) => f.toLowerCase().includes(keyword)),
    );

    if (missingKeywords.length > 0) {
      const description = `Missing implementation for: ${missingKeywords.join(', ')} (based on goal: ${goal.title})`;
      gaps.push({
        description,
        blocksOtherGoals: false,
        isSecurityRelated,
      });
      // Optionally queue research for this gap
      this.deepReasoningService
        .reason({
          taskDescription: description,
          tenantId: null, // Global research for TCE gap
          taskSessionId: null,
          triggerType: 'tce_gap',
        })
        .catch((e) => this.logger.error('Failed to trigger gap research:', e));
    } else if (goal.progress < 100) {
      // Files exist but goal not complete — partial implementation
      gaps.push({
        description: `Partial implementation detected for: ${goal.title} — files exist but goal is ${goal.progress}% complete`,
        blocksOtherGoals: false,
        isSecurityRelated,
      });
    }

    return gaps;
  }

  private async listFilesViaGitHub(
    repo?: string,
    branch?: string,
  ): Promise<string[]> {
    if (!repo) return [];

    const client = this.mcpManager.getClient('github');
    if (!client) return [];

    try {
      const result = await client.callTool({
        name: 'list_files',
        arguments: { repo, branch: branch || 'main', path: '' },
      });
      const text = result?.content?.[0]?.text || '';
      // Parse file list — each line is a file path
      return text.split('\n').filter((l: string) => l.trim().length > 0);
    } catch (e) {
      this.logger.warn(`GitHub MCP list_files failed: ${e.message}`);
      return [];
    }
  }

  private extractKeywords(description: string): string[] {
    if (!description) return [];
    // Extract meaningful nouns/identifiers from goal description
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4) // skip short words
      .slice(0, 10); // top 10 keywords
  }
}
