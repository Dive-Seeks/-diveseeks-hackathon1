import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { TCETask } from './entities/tce-task.entity';
import {
  DiveSeeksProject,
  ProjectTeam,
} from './entities/diveseeks-project.entity';
import { DataRepo } from '../data-engine/entities/data-repo.entity';

import { VisionService } from './vision/vision.service';
import { GapAnalyzerService } from './gap-analysis/gap-analyzer.service';
import { GoalDecomposerService } from './gap-analysis/goal-decomposer.service';
import { PriorityScorerService } from './gap-analysis/priority-scorer.service';
import { GoalTrackerService } from './progress/goal-tracker.service';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { AiProviderRouter } from '../common/ai-provider-router.service';
import { SpecKitEntryService } from '../data-engine';
import { VisionGoal } from './vision/vision.types';
@Injectable()
export class TceService {
  private readonly logger = new Logger(TceService.name);

  constructor(
    @InjectRepository(TCETask)
    private readonly tceTaskRepository: Repository<TCETask>,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
    @InjectRepository(DataRepo)
    private readonly dataRepoRepository: Repository<DataRepo>,
    private readonly visionService: VisionService,
    private readonly gapAnalyzer: GapAnalyzerService,
    private readonly goalDecomposer: GoalDecomposerService,
    private readonly priorityScorer: PriorityScorerService,
    private readonly goalTracker: GoalTrackerService,
    private readonly aiRouter: AiProviderRouter,
    private readonly specKit: SpecKitEntryService,
  ) {}

  async getActiveProjects(): Promise<{ id: string; teamId: string }[]> {
    const projects = await this.projectRepo.find({ where: { active: true } });
    return projects.map((p) => ({ id: p.id, teamId: p.teamId }));
  }

  async getProjectTenantId(projectId: string): Promise<string> {
    const p = await this.projectRepo.findOne({ where: { id: projectId } });
    return p ? p.teamId : '';
  }

  async runGapAnalysis(
    projectId: string,
    tenantId: string,
    taskSizeMultiplier: number = 1.0,
  ): Promise<{ taskCount: number; goalTitles: string[] }> {
    const vision = await this.visionService.getVision(projectId);
    if (!vision || !vision.goals) return { taskCount: 0, goalTitles: [] };

    // Read project.team so the decomposer generates team-appropriate tasks (Rule 1 fix).
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'team'],
    });
    const team: string = project?.team ?? 'coding';

    let taskCount = 0;
    const goalTitles: string[] = [];

    for (const goal of vision.goals) {
      if (goal.status === 'complete') continue;

      const gaps = await this.gapAnalyzer.findGaps(goal, {});

      for (const gap of gaps) {
        const existingTasks = await this.tceTaskRepository.find({
          where: { projectId, tenantId, goalId: goal.id, status: 'queued' },
        });

        if (existingTasks.length > 0) continue;

        const decomposedTasks = this.goalDecomposer.decomposeGoal(
          goal,
          vision,
          gap.description,
          taskSizeMultiplier,
          team,
        );
        const priority = this.priorityScorer.scorePriority(goal, gap);

        for (const taskDef of decomposedTasks) {
          const task = this.tceTaskRepository.create({
            projectId,
            tenantId,
            goalId: goal.id,
            title: taskDef.title,
            description: taskDef.description,
            specialist: taskDef.specialist,
            alsoSpecialist: taskDef.alsoSpecialist,
            priority,
            source: 'tce',
            status: 'queued',
            taskSizeMultiplier,
          } as DeepPartial<TCETask>);

          await this.tceTaskRepository.save(task);
          taskCount++;
        }

        if (!goalTitles.includes(goal.title)) goalTitles.push(goal.title);
      }
    }

    return { taskCount, goalTitles };
  }

  async markTaskDone(taskId: string): Promise<void> {
    const task = await this.tceTaskRepository.findOne({
      where: { id: taskId },
    });
    if (!task) return;
    task.status = 'done';
    await this.tceTaskRepository.save(task);
    await this.goalTracker.onTaskCompleted(task.projectId, task.goalId);
  }

  async createProjectWithRepo(
    teamId: string | null,
    name: string,
    team: ProjectTeam,
    githubRepo?: string,
    techStack?: string[],
    description?: string,
    userId?: string,
  ): Promise<DiveSeeksProject> {
    const conditions: FindOptionsWhere<DiveSeeksProject>[] = [];
    if (teamId) conditions.push({ teamId, name, active: true });
    if (userId) conditions.push({ userId, name, active: true });
    if (conditions.length === 0)
      conditions.push({ teamId: '', name, active: true });
    const existing = await this.projectRepo.findOne({ where: conditions });
    if (existing) {
      throw new ConflictException(`A project named "${name}" already exists.`);
    }

    const project = this.projectRepo.create({
      teamId: teamId ?? '',
      userId: userId ?? null,
      name,
      description: description ?? null,
      team,
      githubRepo,
      techStack: techStack ?? [],
      active: true,
    });
    const savedProject = await this.projectRepo.save(project);

    const dataRepo = this.dataRepoRepository.create({
      tenant_id: teamId || null,
      project_id: savedProject.id,
      name: `${name} Knowledge Base`,
      purpose: `Company knowledge and documents for project "${name}"`,
      status: 'building',
      repo_type: 'general',
    });
    const savedRepo = await this.dataRepoRepository.save(dataRepo);

    savedProject.dataRepoId = savedRepo.id;
    await this.projectRepo.save(savedProject);

    return savedProject;
  }

  async generateProjectPrd(
    projectId: string,
    tenantId: string,
    goals: VisionGoal[],
  ): Promise<void> {
    const prdSchema = z.object({
      features: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          requirements: z.array(
            z.object({
              id: z.string(),
              text: z.string(),
              priority: z.enum(['must', 'should', 'could']),
            }),
          ),
        }),
      ),
    });

    const model = this.aiRouter.getModel('researcher'); // deepseek-reasoner, Gemini fallback

    const goalsBlock = goals
      .map(
        (g, i) =>
          `${i + 1}. ${g.title}${g.description ? ': ' + g.description : ''}`,
      )
      .join('\n');

    try {
      const result = await generateText({
        model: model as any,
        system:
          'You are a senior product manager. Generate a structured PRD from the given project goals. Be specific and actionable. Each goal becomes one feature. Each feature has 2-4 requirements with clear acceptance criteria.',
        prompt: `Project goals:\n${goalsBlock}\n\nGenerate a PRD with features and requirements.`,
        experimental_output: Output.object({ schema: prdSchema }),
      });

      const prd = (result as any).experimental_output as z.infer<
        typeof prdSchema
      >;

      const lines: string[] = [
        '# Product Requirements Document',
        '',
        `_Generated ${new Date().toISOString().slice(0, 10)} from vision interview goals._`,
        '',
      ];

      for (const feature of prd.features) {
        lines.push(`## ${feature.id}. ${feature.title}`, '');
        lines.push(feature.description, '');
        lines.push('**Requirements:**', '');
        for (const req of feature.requirements) {
          lines.push(
            `- **[${req.priority.toUpperCase()}]** \`${req.id}\` — ${req.text}`,
          );
        }
        lines.push('');
      }

      await this.specKit.write(
        projectId,
        'specs/current/prd.md',
        lines.join('\n'),
      );

      this.logger.log(
        `PRD generated for project ${projectId} — ${prd.features.length} features`,
      );
    } catch (err) {
      this.logger.warn(`PRD generation failed: ${(err as Error).message}`);
      // Write a minimal fallback so the Docs tab always has something
      const fallback = goals
        .map(
          (g, i) =>
            `## ${i + 1}. ${g.title}\n\n_PRD generation failed — define requirements manually._\n`,
        )
        .join('\n');
      await this.specKit.write(
        projectId,
        'specs/current/prd.md',
        `# Product Requirements Document\n\n${fallback}`,
      );
    }
  }
}
