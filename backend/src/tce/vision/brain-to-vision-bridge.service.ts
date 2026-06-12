import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateText } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import { BrainSessionService } from '../../abigail-brain/brain-session.service';
import { BrainIdea } from '../../abigail-brain/entities/brain-idea.entity';
import { VisionService } from './vision.service';
import { SpecKitEntryService } from '../../data-engine';
import { CyclePubSubService } from '../../common/cycle-pubsub.service';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { VisionFile } from './vision.types';
import { UserLlmResolverService } from '../../ai-integration/user-llm-resolver.service';
import { DiveSeeksProject } from '../entities/diveseeks-project.entity';

@Injectable()
export class BrainToVisionBridgeService {
  private readonly logger = new Logger(BrainToVisionBridgeService.name);
  private readonly protocolPath = path.resolve(
    process.cwd(),
    '..',
    'agents',
    'rules',
    'vision-interview-protocol.md',
  );

  constructor(
    private readonly brainSession: BrainSessionService,
    @InjectRepository(BrainIdea)
    private readonly ideaRepo: Repository<BrainIdea>,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    private readonly visionService: VisionService,
    private readonly specKit: SpecKitEntryService,
    private readonly cyclePubSub: CyclePubSubService,
    private readonly aiRouter: AiProviderRouter,
    private readonly userLlmResolver: UserLlmResolverService,
  ) {}

  async bridge(
    sessionId: string,
    projectId: string,
    tenantId: string,
    userId: string,
  ): Promise<{ visionFile: VisionFile; suggestedTasks: string[] }> {
    // 1. Complete the brain session
    await this.brainSession.complete(sessionId, tenantId);

    // 1.5 Load project entity
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // 2. Load full conversation transcript (exclude [PLAN] bookkeeping)
    const ideas = await this.ideaRepo.find({
      where: { sessionId, tenantId },
      order: { createdAt: 'ASC' },
    });
    const transcript = ideas
      .filter((i) => !i.content.startsWith('[PLAN]'))
      .map((i) => i.content)
      .join('\n\n');

    // 3. Read output mapping from protocol file
    const protocol = fs.existsSync(this.protocolPath)
      ? fs.readFileSync(this.protocolPath, 'utf-8')
      : '';
    const outputMapping = this.extractSection(protocol, '## Output Mapping');

    // 4. Call LLM to extract VisionFile
    const model = await this.resolveModel(userId, tenantId);
    let visionFile = this.buildFallbackVision(project);

    let textOutput = '';
    const callBridgeLlm = async (extraInstructions = '') => {
      const { text } = await generateText({
        model,
        maxOutputTokens: 4000,
        providerOptions: {
          google: { thinkingConfig: { thinkingBudget: 0 } },
          deepseek: { thinking: { type: 'disabled' } },
        },
        messages: [
          {
            role: 'system',
            content: `You extract a structured project vision from an interview transcript.
Output mapping rules:
${outputMapping}

Return ONLY valid JSON matching this schema exactly — no markdown, no explanation:
{
  "name": string,
  "description": string,
  "techStack": { "locked": [], "forbidden": [], "frontend": [], "backend": [], "infra": [] },
  "goals": [{ "id": "g1", "title": string, "description": string, "status": "pending", "progress": 0 }],
  "constraints": string[],
  "openQuestions": string[]
}
${extraInstructions}`,
          },
          {
            role: 'user',
            content: `Interview transcript:\n\n${transcript}`,
          },
        ],
      });
      return text;
    };

    try {
      textOutput = await callBridgeLlm();
      let parsed: any;
      try {
        parsed = JSON.parse(
          textOutput
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, ''),
        );
      } catch (parseErr) {
        this.logger.warn(
          `[BrainToVisionBridge] JSON parse failed, retrying once: ${parseErr.message}`,
        );
        const retryText = await callBridgeLlm('\nReturn ONLY the JSON object.');
        parsed = JSON.parse(
          retryText
            .trim()
            .replace(/^```json\n?/, '')
            .replace(/\n?```$/, ''),
        );
      }
      visionFile = this.mergeWithDefaults(parsed);
    } catch (err) {
      this.logger.warn(
        `[BrainToVisionBridge] LLM parse failed, using fallback: ${(err as Error).message}`,
      );
    }

    // 5. Save vision
    await this.visionService.updateVision(projectId, visionFile);

    // 6. Generate constitution (non-fatal)
    await this.specKit
      .generateConstitution(projectId)
      .catch((err) =>
        this.logger.warn(
          `[BrainToVisionBridge] constitution generation failed: ${(err as Error).message}`,
        ),
      );

    // 7. Emit vision:ready
    this.cyclePubSub.publishVisionReady({
      projectId,
      teamId: tenantId,
      userId,
      team: project.team,
      tenantId,
      projectName: visionFile.name,
      taskCount: 0,
      goalTitles: visionFile.goals?.map((g) => g.title) ?? [],
    });

    return {
      visionFile,
      suggestedTasks: visionFile.goals?.map((g) => g.title) ?? [],
    };
  }

  private async resolveModel(userId: string, _tenantId: string) {
    const userModel = await this.userLlmResolver.resolveModel(userId);
    return userModel ?? this.aiRouter.getModel('researcher');
  }

  private extractSection(protocol: string, heading: string): string {
    const idx = protocol.indexOf(heading);
    if (idx === -1) return '';
    const next = protocol.indexOf('\n## ', idx + heading.length);
    return next === -1 ? protocol.slice(idx) : protocol.slice(idx, next);
  }

  private buildFallbackVision(project: DiveSeeksProject): VisionFile {
    const desc = project.description || '';

    // Split description into sentences or numbered list items
    const items = desc
      .split(/(?:\.|\n|;)+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    // Filter goals: sentences that are NOT constraints
    const goalSentences = items.filter((s) => !/(?:must|never|no\s)/i.test(s));

    // Fallback if no goal sentences found
    if (goalSentences.length === 0) {
      goalSentences.push('First milestone');
    }

    const goals = goalSentences.map((g, idx) => ({
      id: `g${idx + 1}`,
      title: g.length > 60 ? g.substring(0, 57) + '...' : g,
      description: g,
      status: 'pending',
      progress: 0,
    }));

    // Filter constraints: lines containing must, never, or no
    const constraints = items.filter((s) => /(?:must|never|no\s)/i.test(s));

    return {
      name: project.name || 'Untitled Project',
      description: desc.substring(0, 500),
      techStack: {
        locked: [],
        forbidden: [],
        frontend: [],
        backend: [],
        infra: [],
      },
      goals,
      constraints,
      openQuestions: [],
      setupComplete: true,
    } as any;
  }

  private mergeWithDefaults(parsed: any): VisionFile {
    return {
      name: parsed.name ?? 'Untitled Project',
      description: parsed.description ?? '',
      techStack: {
        locked: parsed.techStack?.locked ?? [],
        forbidden: parsed.techStack?.forbidden ?? [],
        frontend: parsed.techStack?.frontend ?? [],
        backend: parsed.techStack?.backend ?? [],
        infra: parsed.techStack?.infra ?? [],
      },
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
      openQuestions: Array.isArray(parsed.openQuestions)
        ? parsed.openQuestions
        : [],
      setupComplete: true,
    } as any;
  }
}
