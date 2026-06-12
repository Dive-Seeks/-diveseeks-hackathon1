import { Injectable, Optional } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from '../tool-handler.interface';
import { BrowserAgentService } from '../../../web-research/browser-agent.service';

@Injectable()
export class FetchWebTool implements ToolHandler {
  readonly toolName = 'fetch_web';
  readonly domains = ['research', 'general'];

  constructor(@Optional() private readonly browser?: BrowserAgentService) {}

  async execute(ctx: ToolCallContext): Promise<unknown> {
    if (!this.browser) return { error: 'BrowserAgentService not available' };
    const url = ctx.args.url as string;
    if (!url) return { error: 'url is required' };
    const content = await this.browser.scrape(url);
    return { content: content.substring(0, 4000) };
  }
}
