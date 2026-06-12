import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { SpecKitFolderService } from './spec-kit-folder.service';
import {
  SPEC_TEMPLATE,
  PLAN_TEMPLATE,
  TASKS_TEMPLATE,
} from './spec-kit.templates';
import {
  TEAM_SPECIALISTS,
  TEAM_DEFAULTS,
} from '../../tce/gap-analysis/goal-decomposer.service';

export interface ClarifyResult {
  complete: boolean;
  question?: string;
  answers: Record<string, string>;
}

export interface SpecKitLifecycleResult {
  phase: 'clarifying' | 'ready';
  question?: string;
  specPath?: string;
  planPath?: string;
  tasksPath?: string;
}

@Injectable()
export class SpecKitLifecycleService {
  private readonly logger = new Logger(SpecKitLifecycleService.name);

  constructor(
    private readonly folder: SpecKitFolderService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async run(params: {
    projectId: string;
    tenantId: string;
    taskDescription: string;
    clarificationAnswers?: Record<string, string>;
    visionSummary?: string;
    team?: string;
  }): Promise<SpecKitLifecycleResult> {
    const existing = await this.folder.readSpecKitFile(
      params.projectId,
      'specs/current/spec.md',
    );
    if (existing) {
      return { phase: 'ready', specPath: 'specs/current/spec.md' };
    }

    const constitution =
      (await this.folder.readSpecKitFile(
        params.projectId,
        'memory/constitution.md',
      )) ?? '';
    const answers = params.clarificationAnswers ?? {};

    // Clarification gate: need at least one round before writing spec
    if (Object.keys(answers).length === 0) {
      const question = await this.generateClarifyingQuestion(
        params.taskDescription,
        constitution,
        params.visionSummary ?? '',
      );
      return { phase: 'clarifying', question };
    }

    // All answers present — write the three artifacts
    await this.writeSpec(
      params.projectId,
      params.tenantId,
      params.taskDescription,
      constitution,
      answers,
      params.team,
    );
    await this.writePlan(
      params.projectId,
      params.taskDescription,
      constitution,
      params.team,
    );
    await this.writeTasks(
      params.projectId,
      params.taskDescription,
      params.team,
    );

    return {
      phase: 'ready',
      specPath: 'specs/current/spec.md',
      planPath: 'specs/current/plan.md',
      tasksPath: 'specs/current/tasks.md',
    };
  }

  private async generateClarifyingQuestion(
    taskDescription: string,
    constitution: string,
    visionSummary: string,
  ): Promise<string> {
    const model = this.aiRouter.getModel('specialist');
    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Abigail CEO. Your job is to ask ONE clarifying question before writing a spec.
The question must surface ambiguity, edge cases, or constraints not covered by the vision.
Be specific. One sentence. No preamble.

Constitution:
${constitution}

Vision:
${visionSummary}`,
        },
        { role: 'user', content: `Task: ${taskDescription}` },
      ],
      maxOutputTokens: 80,
    });
    return text.trim();
  }

  async writeSpec(
    projectId: string,
    tenantId: string,
    taskDescription: string,
    constitution: string,
    answers: Record<string, string>,
    team?: string,
  ): Promise<void> {
    const model = this.aiRouter.getModel('specialist');
    const answerBlock = Object.entries(answers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const teamGuidance =
      team === 'general'
        ? 'Success Criteria must reflect content, communication, and knowledge work — NOT software engineering. Examples: "document written", "research summary produced", "copy drafted".'
        : team === 'research'
          ? 'Success Criteria must reflect academic research, analysis, and report outputs — NOT software engineering. Examples: "hypothesis documented", "literature reviewed", "findings structured".'
          : 'Success Criteria must reflect working software — endpoints, entities, UI components.';

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Abigail CEO writing a feature specification.
Output ONLY the spec content — no preamble.
Use this template exactly:

${SPEC_TEMPLATE}

Replace all placeholders. Requirements must be numbered (REQ-001, REQ-002 ...).
Success Criteria must be checkable boolean statements.
${teamGuidance}

Constitution (never violate):
${constitution}`,
        },
        {
          role: 'user',
          content: `Task: ${taskDescription}\n\nClarification answers:\n${answerBlock}`,
        },
      ],
      maxOutputTokens: 1200,
    });

    await this.folder.writeSpecKitFile(
      projectId,
      'specs/current/spec.md',
      text.trim(),
    );
    this.logger.log(`[SpecKit] spec.md written for project ${projectId}`);
    // GAP 1 — embed into wiki_pages so spec is searchable
    await this.folder.embedSpecFile(projectId, tenantId, text.trim());
  }

  async writePlan(
    projectId: string,
    taskDescription: string,
    constitution: string,
    team?: string,
  ): Promise<void> {
    const spec =
      (await this.folder.readSpecKitFile(projectId, 'specs/current/spec.md')) ??
      '';
    const model = this.aiRouter.getModel('specialist');

    const teamGuidance =
      team === 'general'
        ? 'Architecture/Structure: list documents, sections, or outlines to create — NOT software architecture (no modules, services, or DB entities).'
        : team === 'research'
          ? 'Architecture/Structure: list literature review structure, methods, and evidence documents to produce — NOT software architecture (no modules, services, or DB entities).'
          : 'Architecture: list NestJS/Next.js modules, services, and entities touched.';

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Abigail CEO writing an implementation plan.
Output ONLY the plan content — no preamble.
Use this template exactly:

${PLAN_TEMPLATE}

Replace all placeholders.
- Constitution Check: list each constitution constraint and state PASS or FAIL for this plan.
- Architecture: ${team === 'general' || team === 'research' ? 'Document Structure / Outline' : 'NestJS/Next.js modules, services, entities touched'}.
- Phases: ordered list, each phase references spec requirement IDs (REQ-XXX).
${teamGuidance}

Team framing rules:
- If team is 'general': use document/section/outline framing. Describe the plan as sections, deliverables, and writing outputs. Do NOT use module, service, entity, API, database, or code vocabulary.
- If team is 'research': use literature review, methodology, evidence gathering, and citation framing. Do NOT use module, service, entity, or code vocabulary.
- If team is 'coding': use module, service, entity, API, database framing (default — no change needed).

Constitution (never violate):
${constitution}`,
        },
        {
          role: 'user',
          content: `Task: ${taskDescription}\n\nSpec:\n${spec}`,
        },
      ],
      maxOutputTokens: 1200,
    });

    await this.folder.writeSpecKitFile(
      projectId,
      'specs/current/plan.md',
      text.trim(),
    );
    this.logger.log(`[SpecKit] plan.md written for project ${projectId}`);
  }

  async writeTasks(
    projectId: string,
    taskDescription: string,
    team?: string,
  ): Promise<void> {
    const spec =
      (await this.folder.readSpecKitFile(projectId, 'specs/current/spec.md')) ??
      '';
    const plan =
      (await this.folder.readSpecKitFile(projectId, 'specs/current/plan.md')) ??
      '';
    const model = this.aiRouter.getModel('specialist');

    // Specialist list scoped to the project's team — sourced from single source of truth (TEAM_SPECIALISTS).
    const resolvedTeam = team ?? 'coding';
    const specialistOptions = (
      TEAM_SPECIALISTS[resolvedTeam] ?? TEAM_SPECIALISTS['coding']
    ).join('|');

    const teamGuidance =
      team === 'general'
        ? 'Tasks are content, knowledge, writing, and communication work — NOT software engineering.'
        : team === 'research'
          ? 'Tasks are academic research, literature review, hypothesis generation, and report writing — NOT software engineering.'
          : 'Tasks are software engineering: backend APIs, frontend components, tests, docs, and infrastructure.';

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: `You are Abigail CEO writing a dependency-ordered task list.
Output ONLY valid YAML — no preamble, no markdown fences.

Each task must have these fields:
  id: TASK-001
  title: short imperative title
  description: one sentence
  specialist: ${specialistOptions}
  goalId: (copy from spec if present, else "")
  dependsOn: [] or [TASK-001, TASK-002]
  priority: integer 1-100 (higher = runs first; tasks with no dependsOn get highest priority)

Rules:
- ${teamGuidance}
- dependsOn must form a valid DAG (no cycles)
- Tasks that depend on others get lower priority than their dependencies
- Maximum 10 tasks

Team framing rules:
- If team is 'general': use document/section/outline framing. Describe the plan as sections, deliverables, and writing outputs. Do NOT use module, service, entity, API, database, or code vocabulary.
- If team is 'research': use literature review, methodology, evidence gathering, and citation framing. Do NOT use module, service, entity, or code vocabulary.
- If team is 'coding': use module, service, entity, API, database framing (default — no change needed).`,
        },
        {
          role: 'user',
          content: `Task: ${taskDescription}\n\nSpec:\n${spec}\n\nPlan:\n${plan}`,
        },
      ],
      maxOutputTokens: 2500,
    });

    let tasksYaml = text.trim();
    // Drop incomplete trailing block
    const isIncomplete = /dependsOn:\s*$|^\s*-\s*TASK-\d*\s*$/m.test(tasksYaml);
    if (isIncomplete) {
      const taskMarker = '\n  - id:';
      const taskMarkerAlt = '\n- id:';
      let lastMarkerIndex = tasksYaml.lastIndexOf(taskMarker);
      if (lastMarkerIndex === -1) {
        lastMarkerIndex = tasksYaml.lastIndexOf(taskMarkerAlt);
      }
      if (lastMarkerIndex !== -1) {
        this.logger.warn(
          `[SpecKit] generateTasks: truncated incomplete trailing block`,
        );
        tasksYaml = tasksYaml.substring(0, lastMarkerIndex).trim();
      }
    }

    const content = `# Tasks: ${taskDescription.substring(0, 60)}\n\n${tasksYaml}`;
    await this.folder.writeSpecKitFile(
      projectId,
      'specs/current/tasks.md',
      content,
    );
    this.logger.log(`[SpecKit] tasks.md written for project ${projectId}`);
  }
}
