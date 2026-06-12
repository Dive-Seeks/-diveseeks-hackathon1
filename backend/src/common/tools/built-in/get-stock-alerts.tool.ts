import { Injectable, Optional } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from '../tool-handler.interface';
import { InventoryService } from '../../../inventory/inventory.service';

@Injectable()
export class GetStockAlertsTool implements ToolHandler {
  readonly toolName = 'get_stock_alerts';
  readonly domains = ['inventory', 'general'];

  constructor(
    @Optional() private readonly inventoryService?: InventoryService,
  ) {}

  async execute(ctx: ToolCallContext): Promise<unknown> {
    if (!this.inventoryService)
      return { error: 'InventoryService not available' };
    const storeId = ctx.args.storeId as string;
    if (!storeId) return { error: 'storeId is required' };
    return (this.inventoryService as any).getBelowThreshold(
      ctx.tenantId,
      storeId,
    );
  }
}
