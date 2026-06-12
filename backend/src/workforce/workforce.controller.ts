import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HookEngine } from '../common/hooks/hook-engine.service';
import { ToolRegistry } from '../common/tools/tool-registry.service';
import { TenantPluginLoader } from './tenant-plugin-loader.service';

@UseGuards(JwtAuthGuard)
@Controller('api/workforce')
export class WorkforceController {
  constructor(
    private readonly hookEngine: HookEngine,
    private readonly toolRegistry: ToolRegistry,
    private readonly pluginLoader: TenantPluginLoader,
  ) {}

  @Get('hooks')
  listHooks() {
    return { data: this.hookEngine.list() };
  }

  @Get('tools')
  listTools() {
    return { data: this.toolRegistry.list() };
  }

  @Post('plugins/reload')
  async reloadPlugins() {
    await this.pluginLoader.reload();
    return { data: { reloaded: true } };
  }
}
