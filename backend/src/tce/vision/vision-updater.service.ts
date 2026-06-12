import { Injectable, Logger } from '@nestjs/common';
import { VisionService } from './vision.service';
import { McpManagerService } from '../../mcp/mcp-manager.service';

@Injectable()
export class VisionUpdaterService {
  private readonly logger = new Logger(VisionUpdaterService.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly mcpManager: McpManagerService,
  ) {}

  async applyVisionUpdate(projectId: string, update: any, reason: string) {
    this.logger.log(
      `Applying vision update for project ${projectId}: ${reason}`,
    );

    // 1. Update local state
    await this.visionService.updateVision(projectId, update);

    // 2. Try to sync to GitHub via PR
    const vision = await this.visionService.getVision(projectId);
    const githubRepo = (vision as any).githubRepo;

    if (githubRepo) {
      await this.syncToGitHub(githubRepo, vision, reason);
    }
  }

  private async syncToGitHub(repo: string, vision: any, reason: string) {
    const client = this.mcpManager.getClient('github');
    if (!client) {
      this.logger.warn(
        'GitHub MCP not available for Vision sync — skipped PR creation.',
      );
      return;
    }

    try {
      const branchName = `vision-update-${Date.now()}`;
      const content = JSON.stringify(vision, null, 2);

      // Create branch
      await client.callTool({
        name: 'create_branch',
        arguments: { repo, branch: branchName },
      });

      // Write file
      await client.callTool({
        name: 'create_or_update_file',
        arguments: {
          repo,
          path: 'docs/vision.json',
          content,
          message: `Update vision: ${reason}`,
          branch: branchName,
        },
      });

      // Create PR
      await client.callTool({
        name: 'create_pull_request',
        arguments: {
          repo,
          title: `[DiveSeeks] Vision Update: ${reason}`,
          body: `Automated vision update from DiveSeeks TCE.\n\nReason: ${reason}`,
          head: branchName,
          base: 'main',
        },
      });

      this.logger.log(
        `Vision PR created successfully for ${repo} on branch ${branchName}`,
      );
    } catch (e) {
      this.logger.error(`Failed to sync Vision to GitHub: ${e.message}`);
    }
  }
}
