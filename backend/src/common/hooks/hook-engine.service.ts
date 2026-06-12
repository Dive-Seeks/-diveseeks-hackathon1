import { Injectable, Logger } from '@nestjs/common';
import { AgentHook, AgentHookContext, HookPoint } from './agent-hook.interface';

@Injectable()
export class HookEngine {
  private readonly logger = new Logger(HookEngine.name);
  private readonly hooks = new Map<HookPoint, AgentHook[]>();

  register(hook: AgentHook): void {
    for (const point of hook.hookPoints) {
      const existing = this.hooks.get(point) ?? [];
      existing.push(hook);
      existing.sort((a, b) => a.priority - b.priority);
      this.hooks.set(point, existing);
    }
    this.logger.log(
      `Registered hook: ${hook.name} at [${hook.hookPoints.join(', ')}]`,
    );
  }

  async run(point: HookPoint, ctx: AgentHookContext): Promise<void> {
    const registered = this.hooks.get(point) ?? [];
    for (const hook of registered) {
      await hook
        .run(point, ctx)
        .catch((err: Error) =>
          this.logger.warn(
            `Hook "${hook.name}" failed at "${point}" (non-fatal): ${err.message}`,
          ),
        );
    }
  }

  list(): { point: HookPoint; hooks: string[] }[] {
    return Array.from(this.hooks.entries()).map(([point, hooks]) => ({
      point,
      hooks: hooks.map((h) => h.name),
    }));
  }
}
