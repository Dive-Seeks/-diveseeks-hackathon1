import { Injectable, Optional } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from '../tool-handler.interface';
import { SalesService } from '../../../sales/sales.service';

@Injectable()
export class GetLiveSalesTool implements ToolHandler {
  readonly toolName = 'get_live_sales';
  readonly domains = ['analytics', 'menu', 'general'];

  constructor(@Optional() private readonly salesService?: SalesService) {}

  async execute(ctx: ToolCallContext): Promise<unknown> {
    if (!this.salesService) return { error: 'SalesService not available' };
    const storeId = ctx.args.storeId as string;
    const groupBy = (ctx.args.groupBy as string) ?? 'category';
    if (!storeId) return { error: 'storeId is required' };
    return (this.salesService as any).getDailySummary(
      ctx.tenantId,
      storeId,
      groupBy,
    );
  }
}
