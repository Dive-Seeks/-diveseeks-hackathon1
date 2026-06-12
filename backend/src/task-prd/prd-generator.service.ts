import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskPrdRequirement } from './entities/task-prd-requirement.entity';
import { TeamRegistryService } from './registries/team-registry.service';
import { FlagRegistryService } from './registries/flag-registry.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { TaskSession } from '../abigail/entities/task-session.entity';
import {
  PrdContext,
  PrdFeature,
  PrdRequirement,
} from './interfaces/prd-base.interface';
import { PrdMemoryBridgeService } from './prd-memory-bridge.service';
import { generateText } from 'ai';
import { TCETask } from '../tce/entities/tce-task.entity';

@Injectable()
export class PrdGeneratorService {
  private readonly logger = new Logger(PrdGeneratorService.name);

  constructor(
    @InjectRepository(TaskPrdFeatureMap)
    private readonly mapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TaskPrdRequirement)
    private readonly reqRepo: Repository<TaskPrdRequirement>,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    private readonly teamRegistry: TeamRegistryService,
    private readonly flagRegistry: FlagRegistryService,
    private readonly aiRouter: AiProviderRouter,
    private readonly memoryBridge: PrdMemoryBridgeService,
  ) {}

  async generatePrd(
    session: TaskSession,
    goalAncestry: any,
  ): Promise<PrdContext> {
    const team = session.team;
    const defaultFlags = await this.teamRegistry.getDefaultFlags(team);
    const allowedFlags = await this.flagRegistry.listAll();

    let parsedFeatures: PrdFeature[] = [];
    let generatedFrom = 'llm';

    let priorFailuresBlock = '';
    try {
      priorFailuresBlock =
        await this.memoryBridge.buildPriorFailuresPromptBlock(
          team,
          session.specialist,
          session.taskDescription,
          5,
        );
    } catch (e) {
      this.logger.warn(
        `[PrdMemoryBridge] read failed, continuing without priors: ${(e as Error).message}`,
      );
    }

    if (this.isGeneralClarifyTask(session)) {
      generatedFrom = 'deterministic';
      parsedFeatures = [this.buildGeneralClarifyFeature()];
    } else if (this.isResearchClarifyTask(session)) {
      generatedFrom = 'deterministic';
      parsedFeatures = [this.buildResearchClarifyFeature()];
    } else {
      try {
        const chatModel = this.aiRouter.getModel('chat');

        // isCodingTask is only true when the session contract is 'code'.
        // A general/research session's outputType is always 'text' regardless of
        // what keywords appear in the description — gist/research specialists can
        // never satisfy requiresFileChange/requiresTestPass/requiresKaiApproval.
        const CODING_SIGNALS =
          /\b(implement|create (module|service|entity|controller|component|endpoint|migration)|build (endpoint|service|component|module|gateway|api)|add (endpoint|entity|route)|develop|nestjs|typescript|react|next\.js|backend|frontend|api|database|migration|socket|websocket)\b/i;
        const isCodingTask =
          session.outputType === 'code' &&
          team !== 'research' &&
          CODING_SIGNALS.test(session.taskDescription);

        const teamGuidance =
          team === 'research'
            ? `IMPORTANT — This is a RESEARCH team. Requirements must be about research quality — NOT code.
Use ONLY: requiresPrimarySource, requiresContradictionCheck, requiresCitations, requiresRecency.
NEVER generate requirements about code, entities, or API endpoints.
Citation and source requirements must be scoped to what this specific task produces. Do not require sources for topics outside this task's description.`
            : isCodingTask
              ? `This is a SOFTWARE IMPLEMENTATION task. Generate requirements that can be verified against code output.
Use: requiresFileChange, requiresTestPass, requiresKaiApproval, requiresTypecheckPass.
Requirements must name the specific file or artifact this task modifies. Do not write requirements for the whole module.
NEVER generate requirements that say "The PRD must define..." or ask about documentation — only about implementation artifacts.`
              : team === 'general'
                ? `IMPORTANT — This is a CONTENT/GENERAL team. The specialist produces written documents, summaries, plans, and briefs — NOT code.
Requirements MUST use ONLY these flags: requiresCoverage, requiresStructuredFormat.
NEVER use: requiresNoHallucination, requiresFileChange, requiresTestPass, requiresKaiApproval, or any coding flag.
NEVER generate requirements about: TypeScript entities, API endpoints, database migrations, tests, or any code artifact.
Coverage and topic requirements must be derived from the task's own description, not from the project goal.

CRITICAL RULE for requiresCoverage topics: Each topic MUST be 1-3 words MAX — never more than 3 words.
Topics must appear VERBATIM as section headings or repeated keywords in the specialist's markdown output.
GOOD topics (short, appear as headings): "User Intent", "Missing Details", "Execution Brief", "Next Steps", "Objectives", "Timeline", "Success Criteria", "Scope", "Deliverables", "Inbox Tray", "Filing Cabinet", "Working Memory".
BAD topics (multi-word abstract phrases that won't appear verbatim): "collaborative workspace design", "content preparation roadmap", "short-term memory as Inbox Tray with limited capacity and rapid decay", "sequential information flow through three stages", "role of attention in memory transfer".
ABSOLUTE RULE: Count the words. If a topic has 4+ words, split it or shorten it. A 7-word topic will NEVER match.

For requiresStructuredFormat: always set "format": "markdown" — the specialist outputs markdown text.
Example requirement: { "text": "Output includes core sections with clear headings", "flags": { "requiresCoverage": { "topics": ["User Intent", "Execution Brief"] }, "requiresStructuredFormat": { "format": "markdown" } } }`
                : `This is a CODING team. Generate software implementation requirements.
Use: requiresFileChange, requiresTestPass, requiresKaiApproval, requiresTypecheckPass.
Requirements must name the specific file or artifact this task modifies. Do not write requirements for the whole module.`;

        // Compute step position among sibling tasks so requirements are scoped
        // to this specific task, not the overall project deliverable.
        let position = 1;
        let total = 1;
        try {
          if (session.projectId) {
            const projectTasks = await this.tceTaskRepo.find({
              where: { projectId: session.projectId },
              order: { createdAt: 'ASC' },
              select: ['id'],
            });
            total = projectTasks.length || 1;
            const tceTaskId = (session.context as any)?.tceTaskId as
              | string
              | undefined;
            const idx = projectTasks.findIndex((t) => t.id === tceTaskId);
            position = idx >= 0 ? idx + 1 : 1;
          }
        } catch (e) {
          this.logger.warn(
            `[PrdGenerator] step-position lookup failed, defaulting to 1/1: ${(e as Error).message}`,
          );
        }

        const isSingleAction =
          !session.taskDescription ||
          session.taskDescription.split(/[.!?]+/).filter((s) => s.trim())
            .length <= 1 ||
          session.taskDescription.length < 120;

        const taskScopeRule = `CRITICAL RULE: Requirements must verify ONLY the direct output of THIS specific task.
Task title: "${session.taskDescription.substring(0, 120)}"
This is Step ${position} of ${total} in the project plan.
Do NOT write requirements for the overall project deliverable, goal, or other tasks.
Do NOT write requirements that require work beyond the scope of this single task.${isSingleAction ? '\nGenerate a maximum of 3 requirements for this task.' : ''}`;

        const specKitContext = (session.context as any)?.specKit;
        const specKitBlock = specKitContext
          ? isCodingTask || team === 'coding'
            ? `\n# Project Spec-Kit
Constitution:
${specKitContext.constitution || 'N/A'}

Spec:
${specKitContext.spec || 'N/A'}

Plan:
${specKitContext.plan || 'N/A'}

Tasks:
${specKitContext.tasks || 'N/A'}
`
            : `\n# Project Constitution
${specKitContext.constitution || 'N/A'}
`
          : '';

        const prompt = `${taskScopeRule}

Generate a PRD for task: ${session.taskDescription.substring(0, 200)}
      Team: ${team}
      Goal: ${goalAncestry?.goalTitle || 'Unknown'}
      Description: ${goalAncestry?.goalDescription || ''}
      ${priorFailuresBlock}
      ${teamGuidance}
      ${specKitBlock}
      Output MUST be valid JSON in this shape:
      {
        "features": [
          {
            "id": "1.1",
            "title": "Feature Title",
            "requirements": [
              {
                "id": "1.1.1",
                "text": "Req text",
                "flags": { "flagName": {} }
              }
            ]
          }
        ]
      }

      Available flags: ${allowedFlags.map((f) => f.flagKey).join(', ')}
      Default flags: ${defaultFlags.join(', ')}`;

        const res = await generateText({ model: chatModel as any, prompt });
        const jsonStr = res.text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        parsedFeatures = parsed.features;

        // Validate flags
        for (const f of parsedFeatures) {
          for (const r of f.requirements) {
            const reqFlags = Object.keys(r.flags);
            for (const rf of reqFlags) {
              if (!allowedFlags.find((af) => af.flagKey === rf)) {
                throw new Error(`Unknown flag in output: ${rf}`);
              }
            }
            // Defense-in-depth: strip any coding flags that leaked into a non-code session.
            // Prevents unsatisfiable PRD contracts when a text specialist receives coding requirements.
            if (session.outputType !== 'code') {
              for (const flag of [
                'requiresFileChange',
                'requiresTestPass',
                'requiresKaiApproval',
                'requiresTypecheckPass',
                'requiresVisionAlignment',
              ]) {
                delete r.flags[flag];
              }
            }
            // Only add vision alignment for coding team — general/research don't write files
            if (team === 'coding' && !r.flags['requiresVisionAlignment']) {
              r.flags['requiresVisionAlignment'] = {};
            }
            // Enforce max-3-word topics — LLM frequently ignores the prompt guidance
            // and generates compound clauses that the keyword matcher can never satisfy.
            if ((r.flags.requiresCoverage as any)?.topics) {
              (r.flags.requiresCoverage as any).topics = (
                (r.flags.requiresCoverage as any).topics as string[]
              ).map((t: string) => t.split(/\s+/).slice(0, 3).join(' '));
            }
          }
        }
      } catch (e) {
        this.logger.warn(
          `Failed to generate PRD via LLM: ${(e as Error).message}, using fallback`,
        );
        generatedFrom = 'fallback';
        parsedFeatures = [
          {
            id: '1.1',
            title: 'Fallback Feature',
            requirements: [
              {
                id: '1.1.1',
                text: 'Complete the task as described',
                flags: defaultFlags.reduce((acc, f) => ({ ...acc, [f]: {} }), {
                  requiresVisionAlignment: {},
                }),
              },
            ],
          },
        ];
      }
    }

    let totalReqs = 0;
    const pendingRequirements: PrdRequirement[] = [];

    for (const f of parsedFeatures) {
      for (const r of f.requirements) {
        totalReqs++;
        pendingRequirements.push(r);
      }
    }

    const featureMap = this.mapRepo.create({
      tenantId: session.teamId,
      taskSessionId: session.id,
      taskSlug: session.taskDescription.substring(0, 50),
      team: session.team,
      goalId: goalAncestry?.goalId,
      goalTitle: goalAncestry?.goalTitle,
      goalDescription: goalAncestry?.goalDescription,
      goal: goalAncestry?.goalTitle || 'Unknown goal',
      startingRoute: null,
      features: parsedFeatures,
      generatedFrom,
      totalRequirements: totalReqs,
    });

    const savedMap = await this.mapRepo.save(featureMap);

    const reqRows = pendingRequirements.map((r) =>
      this.reqRepo.create({
        tenantId: session.teamId,
        featureMapId: savedMap.id,
        taskSessionId: session.id,
        requirementId: r.id,
        requirementText: r.text,
        flags: r.flags,
        iterationNumber: 0,
      }),
    );
    await this.reqRepo.save(reqRows);

    return {
      featureMapId: savedMap.id,
      pendingRequirements,
      previousIterationEvidence: {},
      humanRejectionNotes: [],
    };
  }

  private isGeneralClarifyTask(session: TaskSession): boolean {
    return (
      session.team === 'general' &&
      /^review the goal "/i.test(session.taskDescription)
    );
  }

  private buildGeneralClarifyFeature(): PrdFeature {
    return {
      id: '1.1',
      title: 'General execution brief',
      requirements: [
        {
          id: '1.1.1',
          text: 'The brief must capture the user intent for this goal.',
          flags: {
            requiresCoverage: { topics: ['User Intent'] },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
        {
          id: '1.1.2',
          text: 'The brief must identify missing details and assumptions needed to proceed.',
          flags: {
            requiresCoverage: { topics: ['Missing Details', 'Assumptions'] },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
        {
          id: '1.1.3',
          text: 'The brief must provide a clear execution brief with next steps.',
          flags: {
            requiresCoverage: { topics: ['Execution Brief', 'Next Steps'] },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
      ],
    };
  }

  private isResearchClarifyTask(session: TaskSession): boolean {
    return (
      session.team === 'research' &&
      /^investigate the goal "/i.test(session.taskDescription)
    );
  }

  private buildResearchClarifyFeature(): PrdFeature {
    return {
      id: '1.1',
      title: 'Research brief',
      requirements: [
        {
          id: '1.1.1',
          text: 'The brief must summarize the research goal and question.',
          flags: {
            requiresCoverage: {
              topics: ['Research Goal', 'Research Question'],
            },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
        {
          id: '1.1.2',
          text: 'The brief must define an evidence plan and likely sources.',
          flags: {
            requiresCoverage: { topics: ['Evidence Plan', 'Sources'] },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
        {
          id: '1.1.3',
          text: 'The brief must identify open questions and next steps.',
          flags: {
            requiresCoverage: { topics: ['Open Questions', 'Next Steps'] },
            requiresStructuredFormat: { format: 'markdown' },
          },
        },
      ],
    };
  }
}
