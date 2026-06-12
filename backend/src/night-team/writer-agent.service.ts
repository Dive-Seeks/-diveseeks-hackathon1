import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentIssue } from '../issues/entities/agent-issue.entity';
import { Agent } from '../agents/entities/agent.entity';
import { HeartbeatService } from '../heartbeat/heartbeat.service';
import { MarketingOutputSchema } from '../specialists/schemas/marketing.schema';

@Injectable()
export class WriterAgentService {
  private readonly logger = new Logger(WriterAgentService.name);

  constructor(
    @InjectRepository(AgentIssue)
    private readonly issueRepo: Repository<AgentIssue>,
    @InjectRepository(Agent) private readonly agentRepo: Repository<Agent>,
    private readonly heartbeat: HeartbeatService,
  ) {}

  async run() {
    const issues = await this.issueRepo.find({
      where: { domain: 'writer', status: 'todo' },
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
          outputSchema: MarketingOutputSchema,
          templateFallback: {
            campaignType: 'email',
            targetAudience: 'all',
            content: { subject: '', body: '', callToAction: '' },
            platforms: [],
            recommendedSchedule: '',
            projectedImpact: '',
          },
        });
      } catch (e: any) {
        this.logger.error(`Night writer failed: ${e.message}`);
      }
    }
  }
}
