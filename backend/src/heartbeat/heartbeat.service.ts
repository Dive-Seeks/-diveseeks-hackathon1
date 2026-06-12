import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { streamObject, generateText } from 'ai';
import { ZodSchema } from 'zod';
import { AgentsService } from '../agents/agents.service';
import { IssuesService } from '../issues/issues.service';
import { RunsService } from '../runs/runs.service';
import { ActivityService } from '../activity/activity.service';
import { HeartbeatContextService } from './heartbeat-context.service';
import { ToolGuardrailsService } from '../common/tool-guardrails.service';
import { AiErrorClassifierService } from '../common/ai-error-classifier.service';
import { ToolLoopError } from '../common/errors/tool-loop.error';
import { CerebellumService } from './cerebellum.service';
import { TenantContext } from '../common/soul/soul-engine.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { BudgetService } from '../coordinator/budget.service';
import { ClsService } from 'nestjs-cls';
import { DegradedReasoningService } from '../evolve/degraded-reasoning.service';

import { AI_TASKS } from '../common/ai-models.constants';
import { UserChatService } from '../chat/user-chat.service';

export interface HeartbeatInput {
  issueId: string;
  agentId: string;
  tenantId: string;
  projectId?: string;
  userId?: string;
  tenantContext: TenantContext;
  outputSchema: ZodSchema;
  templateFallback: unknown;
  lastCompact?: string;
}

import { UserLlmResolverService } from '../ai-integration/user-llm-resolver.service';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(
    private readonly agentsService: AgentsService,
    private readonly issuesService: IssuesService,
    private readonly runsService: RunsService,
    private readonly activityService: ActivityService,
    private readonly contextService: HeartbeatContextService,
    private readonly cerebellum: CerebellumService,
    private readonly aiErrorClassifier: AiErrorClassifierService,
    private readonly toolGuardrails: ToolGuardrailsService,
    private readonly aiRouter: AiProviderRouter,
    private readonly budgetService: BudgetService,
    private readonly cls: ClsService,
    private readonly userChatService: UserChatService,
    private readonly degradedReasoning: DegradedReasoningService,
    private readonly userLlmResolver: UserLlmResolverService,
  ) {}

  async dispatch<T>(input: HeartbeatInput): Promise<T> {
    this.cls.set('tenantId', input.tenantId ?? null);
    this.cls.set('userId', input.userId ?? null);
    this.logger.log(
      `[Heartbeat] dispatch — issueId=${input.issueId} tenantId=${input.tenantId} userId=${input.userId ?? 'none'} agentId=${input.agentId}`,
    );

    // STEP 1 — CHECKOUT (atomic, pessimistic_write lock)
    const { issue, runId } = await this.issuesService.checkoutIssueForAgent(
      input.issueId,
      input.agentId,
    );

    // STEP 2 — CREATE RUN RECORD
    const run = await this.runsService.create({
      issueId: issue.id,
      agentId: input.agentId,
      tenantId: input.tenantId,
      idempotencyKey: runId,
      attempt: 1,
    });

    try {
      // STEP 3 — CONTEXT INJECTION
      const agent = await this.agentsService.findOne(input.agentId);
      const { parts, model } = await this.contextService.build(
        agent,
        issue,
        input.tenantContext,
        input.lastCompact,
      );

      // Construct messages for Prompt Caching
      // Static parts (soul, skill, memory) are cached
      const messages = [
        {
          role: 'system' as const,
          content: [parts.soul, parts.skill, parts.memory].join('\n\n---\n\n'),
        },
        {
          role: 'user' as const,
          content: [parts.goalAncestry, parts.continuation]
            .filter(Boolean)
            .join('\n\n---\n\n'),
        },
      ];

      let attempt = 1;
      let rawOutput: any;
      let usage: any;
      const activeModel = model;
      // Set to the Gemini fallback model when shouldFallback fires (overload/rate_limit).
      // Kept separate from activeModel so the budget recorder still sees the original tier.
      let activeFallbackModel: ReturnType<
        AiProviderRouter['getFallbackModel']
      > | null = null;

      // Prefer user's saved key over env-var router when userId is available.
      // Pass specialist id so a specialist-specific BYOK is tried first.
      const userLlm = input.userId
        ? await this.userLlmResolver.resolveModel(
            input.userId,
            (input.tenantContext as any)?.specialist,
          )
        : null;

      if (userLlm) {
        this.logger.log(
          `[Heartbeat] Using user LLM key for issueId=${input.issueId}`,
        );
      } else {
        this.logger.warn(
          `[Heartbeat] No user LLM — using env-router model="${activeModel}" for issueId=${input.issueId}`,
        );
      }

      // Build a JSON-format suffix so the model generates parseable JSON.
      // We use generateText (not streamObject) because streamObject with Gemini
      // structured-output mode hangs indefinitely due to an SDK/API mismatch;
      // generateText returns the same content but via the fast text path.
      let schemaShape = '{}';
      try {
        // Build a human-readable JSON template that shows enum values and array markers.
        // For the "result" field we use a descriptive placeholder instead of the type
        // name "string" so models don't confuse it with the "outcome" enum values
        // (Gemini Flash / DeepSeek tend to put "success" in "result" when both fields
        // appear in the same schema template).
        const shape = (input.outputSchema as any)?.shape ?? {};
        const describe = (field: any, fieldName?: string): string => {
          const typeName = field?._def?.typeName;
          if (typeName === 'ZodEnum') return field._def.values.join('|');
          if (typeName === 'ZodOptional')
            return describe(field._def.innerType, fieldName);
          if (typeName === 'ZodArray') return '["string"]';
          if (typeName === 'ZodString') {
            // Use a clearly descriptive placeholder for "result" so models write
            // real content there rather than copying an enum value.
            if (fieldName === 'result')
              return '<your full written deliverable — markdown, plain text, or structured document>';
            return 'string';
          }
          return 'value';
        };
        schemaShape = JSON.stringify(
          Object.fromEntries(
            Object.entries(shape).map(([k, v]) => [k, describe(v, k)]),
          ),
        );
      } catch {
        /* leave as {} */
      }
      const jsonMessages = [
        ...messages,
        {
          role: 'user' as const,
          content:
            `CRITICAL: Respond with ONLY a raw JSON object — no markdown fences, no text before or after the JSON.\n` +
            `Required JSON format:\n` +
            `${schemaShape}\n\n` +
            `IMPORTANT FIELD RULES:\n` +
            `- "result": Write your COMPLETE deliverable here — the full text, document, plan, or explanation you produced. This is NOT a status field. Never write "success", "done", "fail", "review", or any single-word status in "result".\n` +
            `- "outcome": Use EXACTLY one of: success|needs_review|fail — this is the ONLY field that takes one of these values.\n` +
            `- "filesChanged": [] if no files changed.\n` +
            `- "errorPatterns": [] if no errors.\n` +
            `Respond now with the JSON object only.`,
        },
      ];

      while (attempt <= 3) {
        try {
          this.logger.log(
            `[Heartbeat] LLM call attempt=${attempt} issueId=${input.issueId}`,
          );
          // Use generateText to avoid streamObject's structured-output path which
          // hangs on Gemini 2.5 Flash (SDK v6 / @ai-sdk/google 3.0.x mismatch).
          const PER_ATTEMPT_MS = 150_000;
          const timedOut = Symbol('timeout');
          const genPromise = generateText({
            model:
              userLlm ?? activeFallbackModel ?? this.resolveModel(activeModel),
            messages: jsonMessages,
            maxRetries: 0,
            maxOutputTokens: 1500,
            providerOptions: {
              google: { thinkingConfig: { thinkingBudget: 0 } },
            },
          });
          const result = await Promise.race([
            genPromise.then((r) => ({ r })),
            new Promise<typeof timedOut>((res) =>
              setTimeout(() => res(timedOut), PER_ATTEMPT_MS),
            ),
          ]);
          if (result === timedOut) {
            throw new Error(
              `LLM stream exceeded ${PER_ATTEMPT_MS / 1000}s per-attempt budget`,
            );
          }
          const genResult = result.r;
          usage = genResult.usage;
          // Parse the JSON text response into the expected schema shape.
          const text = genResult.text.trim();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error(
              `Model did not return JSON. Raw: ${text.slice(0, 200)}`,
            );
          }
          try {
            rawOutput = JSON.parse(jsonMatch[0]);
          } catch (jsonErr) {
            // The result field often contains markdown with unescaped quotes.
            // Extract outcome/filesChanged via regex and use raw text as result.
            this.logger.warn(
              `[Heartbeat] JSON.parse failed (${(jsonErr as Error).message.slice(0, 80)}) — recovering fields from raw text`,
            );
            const outcomeMatch = jsonMatch[0].match(
              /"outcome"\s*:\s*"([^"]+)"/,
            );
            rawOutput = {
              result: text,
              outcome: outcomeMatch?.[1] ?? 'needs_review',
              filesChanged: [],
              errorPatterns: [],
            };
          }
          // Normalize common synonyms before schema validation so Gemini's
          // preferred language ("done", "pass") maps to the spec enum values.
          if (rawOutput && typeof rawOutput === 'object') {
            const obj = rawOutput as Record<string, unknown>;
            if (typeof obj.outcome === 'string') {
              const o = obj.outcome
                .toLowerCase()
                .trim()
                .replace(/[_\s-]+/g, '_');
              if (
                [
                  'done',
                  'pass',
                  'complete',
                  'completed',
                  'ok',
                  'passed',
                  'success',
                ].includes(o)
              ) {
                obj.outcome = 'success';
              } else if (
                [
                  'review',
                  'pending_review',
                  'needs_review',
                  'needsreview',
                  'partial',
                  'incomplete',
                ].includes(o)
              ) {
                obj.outcome = 'needs_review';
              } else if (
                [
                  'fail',
                  'failed',
                  'error',
                  'failure',
                  'rejected',
                  'blocked',
                ].includes(o)
              ) {
                obj.outcome = 'fail';
              } else {
                // Unknown outcome — treat as needs_review rather than failing validation.
                this.logger.warn(
                  `[Heartbeat] Unknown outcome "${obj.outcome}" → coerced to needs_review`,
                );
                obj.outcome = 'needs_review';
              }
            } else if (!obj.outcome) {
              obj.outcome = 'needs_review';
            }
            // Normalize optional array fields — model sometimes returns null or string.
            for (const key of ['filesChanged', 'errorPatterns'] as const) {
              if (obj[key] == null || obj[key] === 'none' || obj[key] === '') {
                obj[key] = [];
              } else if (!Array.isArray(obj[key])) {
                obj[key] = [String(obj[key])];
              }
            }
          }
          // Validate against schema — fall through to retry if invalid.
          const parsed = (input.outputSchema as any).safeParse(rawOutput);
          if (!parsed.success) {
            throw new Error(
              `Schema validation failed: ${JSON.stringify(parsed.error.issues).slice(0, 200)}`,
            );
          }
          rawOutput = parsed.data;
          break; // Success
        } catch (err) {
          if (err instanceof ToolLoopError) throw err;
          const classified = this.aiErrorClassifier.classify(err);
          this.logger.warn(
            `AI Error (Attempt ${attempt}): ${classified.reason} - ${classified.message}`,
          );

          if (classified.shouldCompress) {
            this.logger.log('Should compress context...');
            // In future improvement 7, we will add preemptive compaction here
          }
          if (classified.shouldFallback && !userLlm) {
            // getFallbackModel() returns Gemini — not deepseekFlash which is what
            // AI_TASKS.FAST resolves to and which is the same overloaded provider.
            activeFallbackModel = this.aiRouter.getFallbackModel();
          }
          if (classified.retryable && attempt < 3) {
            if (
              classified.reason === 'overloaded' ||
              classified.reason === 'rate_limit'
            ) {
              // Exponential backoff for overload/rate-limit: 3s, 6s, 12s
              await new Promise((r) =>
                setTimeout(r, 3000 * Math.pow(2, attempt - 1)),
              );
            }
            attempt++;
            continue;
          }
          throw err;
        }
      }

      // STEP 4.5 — RECORD SPEND (per-model cost lineage, Paperclip gap #2)
      if (usage) {
        const resolvedModel = this.resolveModel(activeModel);
        const [provider, modelId] = this.splitModelId(resolvedModel);
        await this.budgetService
          .recordSpend(input.tenantId, {
            sessionId: input.issueId,
            provider,
            model: modelId,
            inputTokens: usage.promptTokens ?? 0,
            outputTokens: usage.completionTokens ?? 0,
          })
          .catch((err) =>
            this.logger.warn(`recordSpend failed (non-fatal): ${err.message}`),
          );
      }

      // STEP 5 — CEREBELLUM VALIDATE
      const { output, usedFallback, attempts } = await this.cerebellum.validate(
        rawOutput,
        input.outputSchema,
        issue.domain || 'unknown',
        input.templateFallback,
      );

      // STEP 5.5 — DEGRADED REASONING (Layer 3 auto-escalation)
      let finalOutput: T = output as T;
      try {
        const degradedCheck = await this.degradedReasoning.check({
          tenantId: input.tenantId,
          specialistId: input.agentId,
          taskSessionId: (input.tenantContext as any).taskSessionId ?? null,
          modelUsed: activeModel,
          output: JSON.stringify(output).slice(0, 2000),
          confidence: usedFallback ? 0.3 : 1.0,
          taskRequiresCode: issue.domain === 'coding',
        });

        if (
          degradedCheck.flagged &&
          degradedCheck.outputId &&
          activeModel !== AI_TASKS.RESEARCHER
        ) {
          this.logger.warn(
            `[DegradedReasoning] Layer ${degradedCheck.layer} — escalating issue ${input.issueId} to researcher model`,
          );
          try {
            const { object: escalatedObj } = await streamObject({
              model: this.aiRouter.getModel('researcher'),
              schema: input.outputSchema as any,
              messages,
            });
            const escalatedRaw = await escalatedObj;
            if (escalatedRaw) {
              const { output: escalatedValidated } =
                await this.cerebellum.validate(
                  escalatedRaw,
                  input.outputSchema,
                  issue.domain || 'unknown',
                  input.templateFallback,
                );
              finalOutput = escalatedValidated as T;
              await this.degradedReasoning.markEscalated(
                degradedCheck.outputId,
              );
            }
          } catch (escErr) {
            this.logger.warn(
              `[DegradedReasoning] Layer 3 escalation failed: ${(escErr as Error).message}`,
            );
          }
        }
      } catch (drErr) {
        this.logger.warn(
          `[DegradedReasoning] check failed (non-fatal): ${(drErr as Error).message}`,
        );
      }

      // STEP 9 — UPDATE RUN RECORD
      await this.runsService.complete(run.id, {
        status: 'completed',
        inputTokens: usage?.promptTokens ?? 0,
        outputTokens: usage?.completionTokens ?? 0,
        costUsd: this.estimateCost(usage, model),
        excerptOutput: JSON.stringify(finalOutput).slice(0, 500),
      });

      // STEP 9.5 — Record assistant chat message
      if (input.userId && input.projectId) {
        await this.userChatService
          .persist({
            tenantId: input.tenantId,
            projectId: input.projectId,
            userId: input.userId,
            team: (agent as any).team || 'coding',
            role: 'assistant',
            content:
              typeof finalOutput === 'object' &&
              finalOutput !== null &&
              'result' in finalOutput
                ? String((finalOutput as any).result)
                : JSON.stringify(finalOutput),
          })
          .catch((err) =>
            this.logger.warn(
              `Failed to persist assistant chat: ${err.message}`,
            ),
          );
      }

      // STEP 10 — ACTIVITY LOG
      await this.activityService.log({
        tenantId: input.tenantId,
        issueId: issue.id,
        agentId: input.agentId,
        actor: agent.name,
        action: 'heartbeat_complete',
        payload: { domain: issue.domain, usedFallback, attempts },
      });

      // STEP 12 — RELEASE LOCK
      await this.issuesService.releaseIssue(issue.id);

      return finalOutput;
    } catch (err) {
      await this.runsService.complete(run.id, {
        status: 'failed',
        error: err.message,
      });
      await this.issuesService.releaseIssue(issue.id);
      this.logger.error(
        `Heartbeat failed for issue ${issue.id}: ${err.message || err}`,
        err.stack,
      );
      throw err;
    }
  }

  // STEP 11 — COMPACT
  async compact(sessionContext: string, lastOutput: string): Promise<string> {
    const { text } = await generateText({
      model: this.resolveModel(AI_TASKS.COMPACTION),
      prompt: `Summarise this completed agent session in exactly 2 sentences. Focus on what was produced and any key tenant preferences revealed.\n\nSession:\n${sessionContext}\n\nOutput:\n${lastOutput}`,
    });
    return text;
  }

  private resolveModel(modelId: any) {
    return this.aiRouter.getModel(modelId);
  }

  private splitModelId(resolvedModel: any): [string, string] {
    const provider = resolvedModel?.provider || 'unknown';
    let modelId = resolvedModel?.modelId || 'unknown';

    // Normalize for Rate Card mapping
    if (modelId.includes('gemini-2.5-flash')) {
      modelId = 'gemini-2.5-flash';
    } else if (modelId.includes('gemini-2.0-flash')) {
      modelId = 'gemini-2.0-flash';
    } else if (modelId.includes('gemini-2.5-pro')) {
      modelId = 'gemini-2.5-pro';
    }

    return [provider, modelId];
  }

  private estimateCost(usage: any, model: string): number {
    if (!usage) return 0;
    // Rough estimate using Sonnet 4.6 pricing (assuming same as 3.5 for now)
    const inputCost = (usage.promptTokens ?? 0) * 0.000003;
    const outputCost = (usage.completionTokens ?? 0) * 0.000015;
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }
}
