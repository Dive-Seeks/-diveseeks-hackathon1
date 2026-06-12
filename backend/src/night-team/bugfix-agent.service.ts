import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HeartbeatService } from '../heartbeat/heartbeat.service';
import { z } from 'zod';

const BugfixSchema = z.object({ report: z.string() });

@Injectable()
export class BugfixAgentService {
  private readonly logger = new Logger(BugfixAgentService.name);

  constructor(
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    private readonly heartbeat: HeartbeatService,
  ) {}

  async run() {
    const issues = await this.issueRepo.find({
      where: { domain: 'bugfix', status: 'todo' },
      take: 10,
    });
    for (const issue of issues) {
      const agent = await this.agentRepo.findOne({
        where: { id: issue.assigneeAgentId },
      });
      if (!agent) continue;
      try {
        await this.heartbeat.dispatch({
          issueId: issue.id,
          agentId: agent.id,
          tenantId: issue.tenantId,
          tenantContext: {
            businessName: 'Restaurant',
            tenantId: issue.tenantId,
          },
          outputSchema: BugfixSchema,
          templateFallback: { report: 'No issues' },
        });
      } catch (e: any) {
        this.logger.error(`Night bugfix failed: ${e.message}`);
      }
    }
  }
}
