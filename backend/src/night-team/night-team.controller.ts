import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsAgentService } from './analytics-agent.service';
import { BugfixAgentService } from './bugfix-agent.service';
import { WriterAgentService } from './writer-agent.service';
import { DataAnalystService } from './data-analyst.service';
import { JosSynthesisService } from './jos-synthesis.service';
import { BadRequestException } from '@nestjs/common';

@Controller('night-team')
@UseGuards(JwtAuthGuard)
export class NightTeamController {
  get agents(): Record<string, any> {
    return {
      analytics: this.analyticsAgent,
      bugfix: this.bugfixAgent,
      writer: this.writerAgent,
      'data-analyst': this.dataAgent,
      'jos-synthesis': this.synthesis,
    };
  }

  constructor(
    private readonly analyticsAgent: AnalyticsAgentService,
    private readonly bugfixAgent: BugfixAgentService,
    private readonly writerAgent: WriterAgentService,
    private readonly dataAgent: DataAnalystService,
    private readonly synthesis: JosSynthesisService,
  ) {}

  @Get('status')
  status() {
    return {
      jobs: Object.keys(this.agents).map((name) => ({
        name,
        schedule: 'cron',
      })),
    };
  }

  @Post('trigger/:agent')
  async trigger(@Param('agent') agent: string) {
    const service = this.agents[agent];
    if (!service) throw new BadRequestException(`Unknown agent: ${agent}`);
    await service.run();
    return { triggered: true, agent, issuesProcessed: 0 };
  }
}
