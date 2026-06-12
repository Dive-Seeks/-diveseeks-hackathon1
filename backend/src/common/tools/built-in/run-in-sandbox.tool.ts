import { Injectable, Optional } from '@nestjs/common';
import { ToolHandler, ToolCallContext } from '../tool-handler.interface';
import { SandboxExecutorService } from '../../../sandbox/sandbox-executor.service';

@Injectable()
export class RunInSandboxTool implements ToolHandler {
  readonly toolName = 'run_in_sandbox';
  readonly domains = ['coding'];

  constructor(@Optional() private readonly sandbox?: SandboxExecutorService) {}

  async execute(ctx: ToolCallContext): Promise<unknown> {
    if (!this.sandbox) return { error: 'SandboxExecutorService not available' };
    const code = ctx.args.code as string;
    const language = (ctx.args.language as string) ?? 'typescript';
    if (!code) return { error: 'code is required' };
    return (this.sandbox as any).execute({
      code,
      language,
      tenantId: ctx.tenantId,
    });
  }
}
