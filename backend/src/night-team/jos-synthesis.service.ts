import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsAgentService } from './analytics-agent.service';
import { BugfixAgentService } from './bugfix-agent.service';
import { WriterAgentService } from './writer-agent.service';
import { DataAnalystService } from './data-analyst.service';

@Injectable()
export class JosSynthesisService {
  private readonly logger = new Logger(JosSynthesisService.name);

  constructor(
    private readonly analytics: AnalyticsAgentService,
    private readonly bugfix: BugfixAgentService,
    private readonly writer: WriterAgentService,
    private readonly data: DataAnalystService,
  ) {}

  async run() {
    this.logger.log('JosSynthesisService running (zero LLM)');
    await this.analytics.run();
    await this.bugfix.run();
    await this.writer.run();
    await this.data.run();
  }
}
