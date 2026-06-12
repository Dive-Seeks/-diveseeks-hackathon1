import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecKitFolderService } from './spec-kit-folder.service';
import { TCETask } from '../../tce/entities/tce-task.entity';
import { SpecialistId } from '../../abigail/entities/task-session.entity';
import { DiveSeeksProject } from '../../tce/entities/diveseeks-project.entity';
import {
  TEAM_SPECIALISTS,
  TEAM_DEFAULTS,
} from '../../tce/gap-analysis/goal-decomposer.service';

interface ParsedTask {
  id: string;
  title: string;
  description: string;
  specialist: string;
  goalId: string;
  dependsOn: string[];
  priority: number;
}

@Injectable()
export class SpecKitTaskMapper {
  private readonly logger = new Logger(SpecKitTaskMapper.name);

  constructor(
    private readonly folder: SpecKitFolderService,
    @InjectRepository(TCETask)
    private readonly tceTaskRepo: Repository<TCETask>,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
  ) {}

  async mapToTceTasks(params: {
    projectId: string;
    tenantId: string;
  }): Promise<TCETask[]> {
    const project = await this.projectRepo.findOne({
      where: { id: params.projectId },
    });
    const team = project?.team ?? 'coding';
    const firstGoalId = project?.visionFile?.goals?.[0]?.id || '';

    const allowedSpecialists =
      TEAM_SPECIALISTS[team] ?? TEAM_SPECIALISTS['coding'];
    const specDefault = TEAM_DEFAULTS[team] ?? 'rex';

    const content = await this.folder.readSpecKitFile(
      params.projectId,
      'specs/current/tasks.md',
    );
    if (!content) {
      this.logger.warn(
        `[SpecKitTaskMapper] No content found in tasks.md for project ${params.projectId}`,
      );
      return [];
    }

    const parsed = this.parse(content, team);
    if (parsed.length === 0) {
      this.logger.warn(
        `[SpecKitTaskMapper] Parsed 0 tasks from tasks.md for project ${params.projectId}`,
      );
      return [];
    }

    this.logger.log(
      `[SpecKitTaskMapper] Starting task mapping for project ${params.projectId}. Parsed ${parsed.length} tasks from tasks.md`,
    );

    const existing = await this.tceTaskRepo.find({
      where: { projectId: params.projectId },
      select: ['title'],
    });
    const dbTitles = new Set(
      existing.map((t) => (t.title ?? '').trim().toLowerCase()),
    );

    const sorted = this.topologicalSort(parsed);
    const created: TCETask[] = [];

    for (const task of sorted) {
      if (dbTitles.has(task.title.trim().toLowerCase())) {
        continue;
      }
      const specialist = allowedSpecialists.includes(task.specialist)
        ? task.specialist
        : specDefault;
      const entity = this.tceTaskRepo.create({
        projectId: params.projectId,
        tenantId: params.tenantId,
        goalId: task.goalId || firstGoalId || undefined,
        title: task.title,
        description: task.description,
        specialist: specialist as SpecialistId,
        priority: task.priority,
        source: 'tce',
        status: 'queued',
        taskSizeMultiplier: 1.0,
      });
      const saved = await this.tceTaskRepo.save(entity);
      created.push(saved);
    }

    this.logger.log(
      `[SpecKitTaskMapper] Created ${created.length} TCETasks for project ${params.projectId}`,
    );
    return created;
  }

  /** Returns the task titles declared in tasks.md for a given project, or [] if file missing. */
  async getTaskTitlesFromFile(projectId: string): Promise<string[]> {
    const content = await this.folder.readSpecKitFile(
      projectId,
      'specs/current/tasks.md',
    );
    if (!content) return [];
    return this.parse(content).map((t) => t.title.trim().toLowerCase());
  }

  private parse(content: string, team = 'coding'): ParsedTask[] {
    // Strip markdown heading and fences, extract raw YAML block
    const yamlBlock = content
      .replace(/^#[^\n]*\n/m, '')
      .replace(/```ya?ml/gi, '')
      .replace(/```/g, '')
      .trim();

    if (!yamlBlock) return [];

    // Split on task boundaries (each task starts with "- id:" regardless of indentation)
    const taskBlocks = yamlBlock.split(/(?=^\s*-\s+id:)/m).filter(Boolean);
    const tasks: ParsedTask[] = [];

    for (const block of taskBlocks) {
      try {
        const cleanedBlock = block.replace(/^\s*tasks:\s*\n/i, '');
        const stripped = cleanedBlock.replace(/^\s*-\s*/, '');
        const task = this.parseYamlBlock(stripped, team);
        if (task) tasks.push(task);
      } catch {
        // Malformed block — skip
      }
    }

    return tasks;
  }

  private parseYamlBlock(block: string, team = 'coding'): ParsedTask | null {
    const get = (key: string): string => {
      const match = block.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
      return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
    };

    const getList = (key: string): string[] => {
      const match = block.match(
        new RegExp(`^\\s*${key}:\\s*\\[([^\\]]*)\\]`, 'm'),
      );
      if (match) {
        return match[1]
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      }
      // Multi-line list
      const section = block.match(
        new RegExp(`^\\s*${key}:\\s*\\n((?:\\s*-[^\\n]+\\n)*)`, 'm'),
      );
      if (section) {
        return section[1]
          .split('\n')
          .map((l) => l.replace(/^\s*-\s*/, '').trim())
          .filter(Boolean);
      }
      return [];
    };

    const id = get('id');
    const title = get('title');
    if (!id || !title) return null;

    return {
      id,
      title,
      description: get('description') || title,
      specialist: get('specialist') || (TEAM_DEFAULTS[team] ?? 'rex'),
      goalId: get('goalId') || '',
      dependsOn: getList('dependsOn'),
      priority: parseInt(get('priority') || '50', 10),
    };
  }

  // Kahn's algorithm — tasks with no deps first, then in dependency order
  private topologicalSort(tasks: ParsedTask[]): ParsedTask[] {
    const map = new Map(tasks.map((t) => [t.id, t]));
    const inDegree = new Map(tasks.map((t) => [t.id, 0]));

    for (const task of tasks) {
      for (const dep of task.dependsOn) {
        if (map.has(dep)) {
          inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
        }
      }
    }

    const queue = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0);
    const result: ParsedTask[] = [];
    let priorityCounter = 100;

    while (queue.length > 0) {
      queue.sort((a, b) => b.priority - a.priority);
      const current = queue.shift()!;
      current.priority = priorityCounter--;
      result.push(current);

      for (const task of tasks) {
        if (task.dependsOn.includes(current.id)) {
          const newDegree = (inDegree.get(task.id) ?? 1) - 1;
          inDegree.set(task.id, newDegree);
          if (newDegree === 0) queue.push(task);
        }
      }
    }

    // Any remaining tasks (cycle detected) — append at lowest priority
    for (const task of tasks) {
      if (!result.find((r) => r.id === task.id)) {
        task.priority = priorityCounter--;
        result.push(task);
        this.logger.warn(
          `[SpecKitTaskMapper] Cycle detected involving task ${task.id} — appended at end`,
        );
      }
    }

    return result;
  }
}
