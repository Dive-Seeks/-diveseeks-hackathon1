import { Injectable, Optional } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from '../tool-handler.interface';
import { DataEngineContextService } from '../../../abigail/data-engine-context.service';

@Injectable()
export class SearchWikiTool implements ToolHandler {
  readonly toolName = 'search_wiki';
  readonly domains: string[] = [];

  constructor(
    @Optional() private readonly dataEngine?: DataEngineContextService,
  ) {}

  async execute(ctx: ToolCallContext): Promise<unknown> {
    if (!this.dataEngine)
      return { error: 'DataEngineContextService not available' };
    const query = ctx.args.query as string;
    if (!query) return { error: 'query is required' };
    const result = await (this.dataEngine as any).getContext(
      ctx.tenantId,
      query,
    );
    return { content: result ?? 'No wiki results found.' };
  }
}
