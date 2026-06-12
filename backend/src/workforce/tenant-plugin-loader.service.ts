import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
  Optional,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { HookEngine } from '../common/hooks/hook-engine.service';
import { ToolRegistry } from '../common/tools/tool-registry.service';
import { PluginService } from './plugins/plugin.service';
import { AgentHook, HookPoint } from '../common/hooks/agent-hook.interface';
import {
  ToolHandler,
  ToolCallContext,
} from '../common/tools/tool-handler.interface';
import { SandboxExecutorService } from '../sandbox/sandbox-executor.service';

export const PLUGIN_BASE_PATH = 'PLUGIN_BASE_PATH';

@Injectable()
export class TenantPluginLoader implements OnApplicationBootstrap {
  private readonly logger = new Logger(TenantPluginLoader.name);
  private readonly basePath: string;

  constructor(
    private readonly hookEngine: HookEngine,
    private readonly toolRegistry: ToolRegistry,
    private readonly pluginService: PluginService,
    @Optional() private readonly sandbox?: SandboxExecutorService,
    @Optional() @Inject(PLUGIN_BASE_PATH) basePath?: string,
  ) {
    this.basePath =
      basePath ?? path.resolve(process.cwd(), '..', 'agents', 'plugins');
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.logger.log(`Scanning plugins from: ${this.basePath}`);
    if (!fs.existsSync(this.basePath)) {
      this.logger.warn(`Plugin base path does not exist: ${this.basePath}`);
      return;
    }

    const dirs = fs
      .readdirSync(this.basePath, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const dir of dirs) {
      const pluginDir = path.join(this.basePath, dir.name);
      const manifestPath = path.join(pluginDir, 'PLUGIN.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        const handlerPath = path.join(pluginDir, 'handler.js');
        const hasHandler = fs.existsSync(handlerPath);

        if (!hasHandler) {
          this.logger.debug(
            `Plugin ${manifest.name}: no handler.js — text-only plugin`,
          );
          continue;
        }

        const executionMode =
          manifest.executionMode ??
          (process.env.PLUGIN_EXECUTION_MODE === 'trusted'
            ? 'trusted'
            : 'sandbox');

        if (executionMode === 'trusted') {
          await this.loadTrusted(manifest, handlerPath);
        } else {
          await this.loadSandboxed(manifest, handlerPath);
        }
      } catch (err) {
        this.logger.warn(
          `Failed to load plugin from ${dir.name}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async loadTrusted(manifest: any, handlerPath: string): Promise<void> {
    const mod = require(handlerPath) as {
      tools?: ToolHandler[];
      hooks?: AgentHook[];
    };
    for (const tool of mod.tools ?? []) {
      this.toolRegistry.register(tool);
      this.logger.log(`Trusted plugin tool registered: ${tool.toolName}`);
    }
    for (const hook of mod.hooks ?? []) {
      this.hookEngine.register(hook);
      this.logger.log(`Trusted plugin hook registered: ${hook.name}`);
    }
  }

  private async loadSandboxed(
    manifest: any,
    handlerPath: string,
  ): Promise<void> {
    for (const toolDecl of manifest.tools ?? []) {
      const sandboxProxy: ToolHandler = {
        toolName: toolDecl.name,
        domains: manifest.domains ?? [],
        execute: async (ctx: ToolCallContext) => {
          if (!this.sandbox) {
            return {
              error:
                'Sandbox not available — set PLUGIN_EXECUTION_MODE=trusted for local dev',
            };
          }
          const code = fs.readFileSync(handlerPath, 'utf-8');
          return (this.sandbox as any).execute({
            code: `${code}\n\nmodule.exports.tools.find(t=>t.toolName==='${toolDecl.name}').execute(${JSON.stringify(ctx)})`,
            language: 'javascript',
            tenantId: ctx.tenantId,
          });
        },
      };
      this.toolRegistry.register(sandboxProxy);
      this.logger.log(`Sandbox plugin tool registered: ${toolDecl.name}`);
    }
  }
}
