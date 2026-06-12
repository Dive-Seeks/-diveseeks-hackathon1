import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ISpecialist,
  ExecutionResult,
  SpecialistOutputSchema,
  SpecialistOutput,
} from './specialist.interface';
import { TaskSession } from '../entities/task-session.entity';
import { Context7Service } from '../../mcp/context7.service';
import { HeartbeatService } from '../../heartbeat/heartbeat.service';
import { PromptVersionService } from '../../evolve/prompt-version.service';
import { CodingSpecialistBootstrapService } from './coding-specialist-bootstrap.service';
import { AgentChatService } from '../../agent-chat/agent-chat.service';
import { ToolRegistry } from '../../common/tools/tool-registry.service';
import { ToolCallContext } from '../../common/tools/tool-handler.interface';
import { SpecialistDocumentsService } from '../../specialist-documents/specialist-documents.service';
import { TrajectoryWriterService } from '../../evolve/trajectory-writer.service';
import { ChatService } from '../../chat/chat.service';

const SPECIALIST_PROMPTS: Record<string, string> = {
  rex: `You are Rex, a methodical backend engineer. You are security-conscious and prefer typed languages.
You ALWAYS read existing API patterns, DB schema, and dependency graphs from project context before touching any file.
Your output is working code files, migration scripts, and API endpoints — matching the project's existing style exactly.
You never use SELECT *. Every query filters by tenant_id. You never hardcode secrets.

--- CRAFT DISCIPLINE ---
Write or reference test files before implementation files.
Your output MUST include at least one *.spec.ts file in a fenced code block with its path.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  nova: `You are Nova, a user-obsessed frontend engineer. You are performance-first and accessibility-aware.
You ALWAYS read the existing component tree, routing structure, and design tokens before writing anything.
You follow the project's existing UI framework, styling patterns, and naming conventions exactly.
You write components that are accessible (ARIA labels, keyboard nav) and mobile-responsive.

--- CRAFT DISCIPLINE ---
Write or reference test files before implementation files.
Your output MUST include at least one *.spec.ts file in a fenced code block with its path.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  kai: `You are Kai, a strict code reviewer. You are pedantic and never approve bad patterns.
You ALWAYS check the submitted code against: project history, existing conventions, security rules, and performance patterns.
Your output is a review report with pass/fail, specific line references, and citations to project patterns.
You never rubber-stamp. Every approval must be earned. Catch tenant_id leaks, SQL injection, and type unsafety.

--- CRAFT DISCIPLINE ---
You are the architecture enforcement gate. You MUST flag any import from forbidden libraries.
Forbidden libraries are listed in the vision tech stack (provided in your context).
If submitted code imports a forbidden library, mark the review FAIL with the specific import line.
--- END CRAFT DISCIPLINE ---`,

  sage: `You are Sage, a coverage-obsessed test engineer. You hunt edge cases.
You ALWAYS read existing test patterns and CI config before writing new tests — never contradict the existing test setup.
Your output matches the project's existing test framework and patterns exactly.
You always cover: happy path, error path, edge cases, boundary conditions, and security inputs.

--- CRAFT DISCIPLINE ---
Write or reference test files before implementation files.
Your output MUST include at least one *.spec.ts file in a fenced code block with its path.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  atlas: `You are Atlas, a reliability-first DevOps engineer. You automate everything.
You ALWAYS read existing Dockerfile, CI config, and deployment scripts before proposing any changes.
Your output extends — never contradicts — the existing deployment setup.
You write infrastructure as code, never manual steps.

--- CRAFT DISCIPLINE ---
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  orion: `You are Orion, a big-picture architect. You enforce YAGNI. You think in dependencies.
You ALWAYS read the full dependency graph, file structure, and open issues before any architecture decision.
Your output is architecture diagrams, file structure plans, and spec documents — always grounded in current project state.
You never propose building what already exists. You flag scope creep.

--- CRAFT DISCIPLINE ---
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  pixel: `You are Pixel, a systematic debugger. You never guess. You trace everything.
You ALWAYS read git blame, issue history, and past error patterns before proposing any fix.
Your output is: root cause analysis, minimal targeted fix, and prevention recommendation.
You always reference when this error pattern appeared before (from project memory).

--- CRAFT DISCIPLINE ---
State root cause explicitly before any code fix:
  "Root cause: <concise explanation>"
Do not propose a fix until root cause is stated.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  luma: `You are Luma, a documentation specialist. You write clearly and concisely for developers.
You ALWAYS read existing README, changelog, and API docs before writing — never contradict existing docs.
You output fits the project's existing documentation style and covers the actual current code state.
For junior developer tasks, you add clear inline comments explaining WHY (not what).

--- CRAFT DISCIPLINE ---
Never use forbidden libraries in code examples. Forbidden libraries are in the vision tech stack.
Always show complete file content in fenced blocks with file path on the opening fence.
--- END CRAFT DISCIPLINE ---`,

  felix: `You are Felix, a paranoid security auditor. You think like an attacker, audit like an expert.
You check every new endpoint against OWASP Top 10. You trace every auth flow.
Your output is a security audit report with: CVE references where applicable, specific vulnerable lines, and concrete fixes.
You always check: input validation, output encoding, auth bypass, injection, broken access control.

--- CRAFT DISCIPLINE ---
State root cause explicitly before any code fix:
  "Root cause: <concise explanation>"
Do not propose a fix until root cause is stated.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,

  vex: `You are Vex, an ethical web security tester. You attack the live app, not just the code.
You use browser automation to test XSS, CSRF, injection, and broken auth against real endpoints.
Your output is a live attack surface report: what you tested, what succeeded, what the payload was, and remediation steps.
You work after Felix — you validate that Felix's code-level fixes actually hold up under real attacks.

--- CRAFT DISCIPLINE ---
State root cause explicitly before any code fix:
  "Root cause: <concise explanation>"
Do not propose a fix until root cause is stated.
Never import from forbidden libraries: these are in the vision tech stack.
Always produce complete file content in fenced blocks with the file path on the opening fence:
  \`\`\`typescript path/to/file.ts
  ...content...
  \`\`\`
--- END CRAFT DISCIPLINE ---`,
};

export abstract class BaseSpecialist implements ISpecialist {
  protected logger: Logger;

  @Inject(AgentChatService)
  protected readonly agentChat: AgentChatService;

  @Inject(ToolRegistry)
  protected readonly toolRegistry: ToolRegistry;

  @Inject(SpecialistDocumentsService)
  protected readonly specialistDocs: SpecialistDocumentsService;

  @Inject(TrajectoryWriterService)
  protected readonly trajectoryWriter: TrajectoryWriterService;

  @Inject(ChatService)
  protected readonly chatService: ChatService;

  constructor(
    public readonly id: string,
    protected readonly context7Service: Context7Service,
    protected readonly heartbeat: HeartbeatService,
    protected readonly promptVersionService: PromptVersionService,
    protected readonly bootstrap: CodingSpecialistBootstrapService,
  ) {
    this.logger = new Logger(this.id);
  }

  protected getDefaultPrompt(): string {
    return SPECIALIST_PROMPTS[this.id] ?? `You are ${this.id}, a specialist.`;
  }

  async execute(
    session: TaskSession,
    issueId?: string,
  ): Promise<ExecutionResult> {
    const visionSummary = (session.context as any)?.visionSummary ?? '';

    // Resolve evolved prompt or fallback to hardcoded default
    const promptVersion = await this.promptVersionService.getActivePrompt(
      this.id,
    );
    const systemPrompt = promptVersion?.systemPrompt ?? this.getDefaultPrompt();

    this.logger.log(
      `[${this.id}] Executing task: ${session.taskDescription.substring(0, 80)}... | userId=${session.userId} team=${session.team}`,
    );

    this.agentChat.emit({
      tenantId: session.teamId,
      projectId: session.projectId,
      threadId: session.id,
      fromAgent: this.id,
      domain: 'specialist',
      interactionType: 'job_started',
      content: `Starting phase 1 of ${session.id.substring(0, 8)}.`,
    });

    let docSnippet = '';
    const lowerTask = session.taskDescription.toLowerCase();
    if (
      lowerTask.includes('how to') ||
      lowerTask.includes('library') ||
      lowerTask.includes('use')
    ) {
      const match = lowerTask.match(/(?:using|with|in)\s+([a-z0-9-_.]+)/i);
      if (match?.[1]) {
        try {
          docSnippet = await this.context7Service.queryDocs(
            match[1],
            session.taskDescription,
          );
          this.logger.log(
            `[${this.id}] Fetched Context7 docs for: ${match[1]}`,
          );
        } catch (e) {
          this.logger.warn(
            `[${this.id}] Context7 fetch failed: ${(e as Error).message}`,
          );
        }
      }
    }

    const startTime = Date.now();

    const agentUuid = this.bootstrap.getAgentId(this.id);

    const output = await this.heartbeat.dispatch<SpecialistOutput>({
      issueId: issueId ?? session.id,
      agentId: agentUuid,
      tenantId: session.teamId,
      projectId: session.projectId,
      userId: session.userId,
      tenantContext: {
        soul: systemPrompt,
        visionSummary,
        companyKnowledge: (session.context as any)?.companyKnowledge ?? '',
        webKnowledgePrompt: (session.context as any)?.webKnowledgePrompt ?? '',
        docSnippet: docSnippet.substring(0, 2000),
        taskDescription: session.taskDescription,
        profileFlags: session.profileFlags,
        injectedWeights: (session.context as any)?.injectedWeights ?? [],
        skillsContext: (session.context as any)?.skillsContext ?? '',
        pluginsContext: (session.context as any)?.pluginsContext ?? '',
        specialist: this.id,
        team: session.team ?? 'coding',
      } as any,
      outputSchema: SpecialistOutputSchema,
      templateFallback: {
        result: 'Specialist unavailable — fallback used',
        outcome: 'fail',
      },
    });

    const resolvedResult = await this.resolveToolCalls(output.result, session);

    if (session.projectId && resolvedResult.trim().length > 0) {
      const docDate = new Date().toISOString().slice(0, 10);
      const trajectoryOutcome =
        output.outcome === 'success'
          ? 'pass'
          : output.outcome === 'needs_review'
            ? 'needs_review'
            : 'fail';

      // 1. Write specialist document (the output as a readable doc)
      void this.specialistDocs
        .upsert(
          session.teamId,
          session.projectId,
          this.id,
          `${this.id} — ${docDate}`,
          resolvedResult,
          'job-output',
        )
        .catch((err: Error) =>
          this.logger.warn(`[${this.id}] doc upsert failed: ${err.message}`),
        );

      // 2. Write AgentEpisode — experience system feeds ParametricCompressionService
      void this.specialistDocs
        .writeEpisode(
          session.teamId,
          this.id,
          session.projectId,
          resolvedResult.substring(0, 1000),
          session.team ?? 'general',
          trajectoryOutcome,
        )
        .catch((err: Error) =>
          this.logger.warn(`[${this.id}] episode write failed: ${err.message}`),
        );

      const emotionTag =
        trajectoryOutcome === 'fail'
          ? 'sadness'
          : trajectoryOutcome === 'needs_review'
            ? 'sadness'
            : 'satisfaction';

      // 3. Write trajectory — feeds PredictionEngineService for general/research teams
      void this.trajectoryWriter
        .write({
          tenantId: session.teamId,
          specialistId: this.id,
          team: session.team ?? 'general',
          taskDescription: session.taskDescription.substring(0, 1000),
          outcome: trajectoryOutcome,
          emotionTag,
        })
        .catch((err: Error) =>
          this.logger.warn(
            `[${this.id}] trajectory write failed: ${err.message}`,
          ),
        );

      // 4. Persist to chat_messages — Dreamer reads these nightly for user_preferences
      void this.chatService
        .saveMessage(session.teamId, session.team ?? 'general', {
          senderRole: 'specialist',
          senderType: 'agent',
          agentName: this.id,
          senderId: this.id,
          content: resolvedResult,
          projectId: session.projectId,
          threadId: session.id,
          interactionType: 'job_completed',
        })
        .catch((err: Error) =>
          this.logger.warn(`[${this.id}] chat persist failed: ${err.message}`),
        );
    }

    return {
      result: resolvedResult,
      report: {
        specialistId: this.id,
        taskSessionId: session.id,
        toolsUsed: [
          { toolName: 'heartbeat', callCount: 1, outcome: 'success' },
          ...(docSnippet
            ? [
                {
                  toolName: 'context7-docs',
                  callCount: 1,
                  outcome: 'success' as const,
                },
              ]
            : []),
        ],
        taskOutcome: output.outcome,
        errorPatterns: output.errorPatterns ?? [],
        duration: Date.now() - startTime,
      },
    };
  }

  protected async resolveToolCalls(
    output: string,
    session: TaskSession,
  ): Promise<string> {
    const pattern = /TOOL_CALL::([a-z_]+)::(\{[^}]*\})/g;
    let match: RegExpExecArray | null;
    let resolved = output;

    while ((match = pattern.exec(output)) !== null) {
      const toolName = match[1];
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(match[2]);
      } catch {
        resolved = resolved.replace(
          match[0],
          `TOOL_ERROR::${toolName}::invalid JSON args`,
        );
        continue;
      }

      const ctx: ToolCallContext = {
        tenantId: session.teamId,
        specialist: this.id,
        sessionId: session.id,
        toolName,
        args,
      };

      try {
        const result = await this.toolRegistry.call(toolName, ctx);
        const resultStr =
          typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        resolved = resolved.replace(
          match[0],
          `TOOL_RESULT::${toolName}::${resultStr}`,
        );
      } catch (err) {
        resolved = resolved.replace(
          match[0],
          `TOOL_ERROR::${toolName}::${(err as Error).message}`,
        );
      }
    }

    return resolved;
  }
}

@Injectable()
export class RexSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('rex', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class NovaSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('nova', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class KaiSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('kai', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class SageSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('sage', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class AtlasSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('atlas', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class OrionSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('orion', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class PixelSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('pixel', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class LumaSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('luma', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class FelixSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('felix', c7, heartbeat, pv, bootstrap);
  }
}

@Injectable()
export class VexSpecialist extends BaseSpecialist {
  constructor(
    c7: Context7Service,
    heartbeat: HeartbeatService,
    pv: PromptVersionService,
    bootstrap: CodingSpecialistBootstrapService,
  ) {
    super('vex', c7, heartbeat, pv, bootstrap);
  }
}
