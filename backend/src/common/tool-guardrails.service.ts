import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export type GuardrailDecision = {
  action: 'allow' | 'warn' | 'block' | 'halt';
  code: string;
  message: string;
  count: number;
  signature: string;
};

const GUARDRAIL_CONFIG = {
  exactFailureWarn: 2,
  exactFailureStop: 5,
  toolFailureWarn: 3,
  toolFailureStop: 8,
  noProgressWarn: 2,
  noProgressStop: 5,
};

const IDEMPOTENT_TOOLS = new Set([
  'read_menu',
  'search_products',
  'fetch_analytics',
  'web_search',
  'web_fetch',
  'scan_memory_index',
  'fetch_episodes',
  'get_tenant_context',
  'check_stock_level',
]);

const MUTATING_TOOLS = new Set([
  'write_menu_item',
  'update_product',
  'create_campaign',
  'generate_image',
  'write_description',
  'update_seo',
  'post_social',
  'send_email',
  'approve_reorder',
]);

@Injectable()
export class ToolGuardrailsService {
  private readonly logger = new Logger(ToolGuardrailsService.name);

  // session_id -> { signature -> count }
  private exactFailures = new Map<string, Map<string, number>>();
  // session_id -> { toolName -> count }
  private toolFailures = new Map<string, Map<string, number>>();
  // session_id -> { signature -> hash_of_result }
  private lastResults = new Map<string, Map<string, string>>();
  // session_id -> { signature -> count }
  private noProgress = new Map<string, Map<string, number>>();

  afterCall(sessionId: string, result: any): GuardrailDecision {
    if (!result || !result.toolName)
      return {
        action: 'allow',
        code: 'ok',
        message: '',
        count: 0,
        signature: '',
      };

    const toolName = result.toolName;
    const argsStr = JSON.stringify(result.args || {});
    const signature = crypto
      .createHash('md5')
      .update(`${toolName}:${argsStr}`)
      .digest('hex');

    // Initialize maps
    if (!this.exactFailures.has(sessionId))
      this.exactFailures.set(sessionId, new Map());
    if (!this.toolFailures.has(sessionId))
      this.toolFailures.set(sessionId, new Map());
    if (!this.lastResults.has(sessionId))
      this.lastResults.set(sessionId, new Map());
    if (!this.noProgress.has(sessionId))
      this.noProgress.set(sessionId, new Map());

    const isError =
      result.result && typeof result.result === 'object' && result.result.error;

    if (isError) {
      // Exact failure
      const exactCount =
        (this.exactFailures.get(sessionId)!.get(signature) || 0) + 1;
      this.exactFailures.get(sessionId)!.set(signature, exactCount);

      // Tool failure
      const toolCount =
        (this.toolFailures.get(sessionId)!.get(toolName) || 0) + 1;
      this.toolFailures.get(sessionId)!.set(toolName, toolCount);

      if (exactCount >= GUARDRAIL_CONFIG.exactFailureStop) {
        return {
          action: 'halt',
          code: 'exact_failure_stop',
          message: `Tool ${toolName} failed exactly ${exactCount} times with same arguments.`,
          count: exactCount,
          signature,
        };
      }
      if (toolCount >= GUARDRAIL_CONFIG.toolFailureStop) {
        return {
          action: 'halt',
          code: 'tool_failure_stop',
          message: `Tool ${toolName} failed ${toolCount} times.`,
          count: toolCount,
          signature,
        };
      }
      if (exactCount >= GUARDRAIL_CONFIG.exactFailureWarn) {
        return {
          action: 'warn',
          code: 'exact_failure_warn',
          message: `Warning: Tool ${toolName} failing. Try different arguments.`,
          count: exactCount,
          signature,
        };
      }
    } else {
      // Success, clear exact failure for this signature
      this.exactFailures.get(sessionId)!.set(signature, 0);

      // Check no-progress for idempotent tools
      if (IDEMPOTENT_TOOLS.has(toolName)) {
        const resultHash = crypto
          .createHash('md5')
          .update(JSON.stringify(result.result))
          .digest('hex');
        const lastHash = this.lastResults.get(sessionId)!.get(signature);

        if (lastHash === resultHash) {
          const npCount =
            (this.noProgress.get(sessionId)!.get(signature) || 0) + 1;
          this.noProgress.get(sessionId)!.set(signature, npCount);

          if (npCount >= GUARDRAIL_CONFIG.noProgressStop) {
            return {
              action: 'halt',
              code: 'no_progress_stop',
              message: `Tool ${toolName} returned identical results ${npCount} times.`,
              count: npCount,
              signature,
            };
          }
          if (npCount >= GUARDRAIL_CONFIG.noProgressWarn) {
            return {
              action: 'warn',
              code: 'no_progress_warn',
              message: `Warning: Tool ${toolName} returned identical results. Try a different approach.`,
              count: npCount,
              signature,
            };
          }
        } else {
          this.lastResults.get(sessionId)!.set(signature, resultHash);
          this.noProgress.get(sessionId)!.set(signature, 0);
        }
      }
    }

    return { action: 'allow', code: 'ok', message: '', count: 0, signature };
  }

  clearSession(sessionId: string) {
    this.exactFailures.delete(sessionId);
    this.toolFailures.delete(sessionId);
    this.lastResults.delete(sessionId);
    this.noProgress.delete(sessionId);
  }
}
