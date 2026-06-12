import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SpecialistDocument } from '../specialist-documents/entities/specialist-document.entity';
import { TaskPrdRequirement } from '../task-prd/entities/task-prd-requirement.entity';
import { TaskSession } from '../abigail/entities/task-session.entity';
import { TCETask } from '../tce/entities/tce-task.entity';
import { DiveSeeksProject } from '../tce/entities/diveseeks-project.entity';

@Injectable()
export class ProjectReportAssemblerService {
  private readonly logger = new Logger(ProjectReportAssemblerService.name);

  constructor(
    @InjectRepository(SpecialistDocument)
    private readonly docsRepo: Repository<SpecialistDocument>,
    @InjectRepository(TaskPrdRequirement)
    private readonly prdReqRepo: Repository<TaskPrdRequirement>,
    @InjectRepository(TaskSession)
    private readonly sessionRepo: Repository<TaskSession>,
    @InjectRepository(TCETask)
    private readonly tceRepo: Repository<TCETask>,
    @InjectRepository(DiveSeeksProject)
    private readonly projectRepo: Repository<DiveSeeksProject>,
  ) {}

  async buildBundle(
    tenantId: string,
    projectId: string,
  ): Promise<{ markdown: string; tsv: string }> {
    const [project, docs, tasks, sessions] = await Promise.all([
      this.projectRepo.findOne({ where: { id: projectId } }),
      this.docsRepo.find({
        where: { tenantId, projectId },
        order: { createdAt: 'ASC' },
      }),
      this.tceRepo.find({
        where: { projectId },
        order: { priority: 'ASC', createdAt: 'ASC' },
      }),
      this.sessionRepo.find({
        where: { projectId },
        order: { createdAt: 'ASC' },
      }),
    ]);

    let prdRows: TaskPrdRequirement[] = [];
    const completedSessionIds = sessions
      .filter((s) => ['done', 'review', 'failed'].includes(s.status))
      .map((s) => s.id);

    if (completedSessionIds.length > 0) {
      try {
        prdRows = await this.prdReqRepo.find({
          where: { taskSessionId: In(completedSessionIds) },
          order: { taskSessionId: 'ASC' },
        });
      } catch (e) {
        this.logger.warn(
          `PRD rows fetch failed, continuing without: ${(e as Error).message}`,
        );
      }
    }

    const markdown = this.buildMarkdown(
      project,
      docs,
      tasks,
      sessions,
      prdRows,
    );
    const tsv = this.buildTsv(docs, tasks, sessions, prdRows);
    return { markdown, tsv };
  }

  private buildMarkdown(
    project: DiveSeeksProject | null,
    docs: SpecialistDocument[],
    tasks: TCETask[],
    sessions: TaskSession[],
    prdRows: TaskPrdRequirement[],
  ): string {
    const lines: string[] = [];

    lines.push(`# Project Data Bundle: ${project?.name ?? 'Unknown Project'}`);
    lines.push(
      `Team: ${project?.team ?? 'unknown'} | Status: ${project?.lifecycleStatus ?? 'unknown'}`,
    );
    if (project?.description)
      lines.push(`\nDescription: ${project.description}`);
    lines.push('');

    // Spec-Kit from first session context
    const firstSession = sessions[0];
    const specKit = (firstSession?.context as any)?.specKit;
    if (specKit) {
      lines.push('## Vision & Spec-Kit');
      if (specKit.constitution)
        lines.push(
          `### Constitution\n${String(specKit.constitution).substring(0, 2000)}`,
        );
      if (specKit.spec)
        lines.push(`### Spec\n${String(specKit.spec).substring(0, 2000)}`);
      if (specKit.plan)
        lines.push(`### Plan\n${String(specKit.plan).substring(0, 2000)}`);
      lines.push('');
    }

    lines.push('## Specialist Outputs');
    if (docs.length === 0) {
      lines.push('No specialist documents produced.');
    } else {
      for (const doc of docs) {
        lines.push(`### ${doc.specialistId} — ${doc.title}`);
        lines.push(doc.content.substring(0, 3000));
        lines.push('');
      }
    }

    lines.push('## Task Outcomes');
    for (const task of tasks) {
      const session = sessions.find((s) => {
        const ctx = s.context as any;
        return ctx?.tceTaskId === task.id || s.taskDescription === task.title;
      });
      const status = session?.status ?? task.status;
      lines.push(`- **${task.title}** (${task.specialist}) → ${status}`);
      if (session?.result) {
        lines.push(`  Result: ${session.result.substring(0, 200)}`);
      }
    }
    lines.push('');

    lines.push('## PRD Findings (Satisfied Requirements)');
    if (prdRows.length === 0) {
      lines.push('No PRD requirements recorded as satisfied.');
    } else {
      const passed = prdRows.filter((r) => r.satisfied);
      const failed = prdRows.filter((r) => !r.satisfied);
      for (const r of passed) {
        lines.push(`- [PASS] ${r.requirementText.substring(0, 150)}`);
      }
      for (const r of failed) {
        lines.push(`- [FAIL] ${r.requirementText.substring(0, 150)}`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }

  private buildTsv(
    docs: SpecialistDocument[],
    tasks: TCETask[],
    sessions: TaskSession[],
    prdRows: TaskPrdRequirement[],
  ): string {
    const escape = (s: string) =>
      s.replace(/\t/g, ' ').replace(/\n/g, ' ').substring(0, 200);

    const rows: string[] = [
      'type\tspecialist\ttitle\tcontent_preview\tstatus\tcreated_at',
    ];

    for (const doc of docs) {
      rows.push(
        [
          'specialist_output',
          doc.specialistId,
          escape(doc.title),
          escape(doc.content),
          'done',
          doc.createdAt.toISOString(),
        ].join('\t'),
      );
    }

    for (const task of tasks) {
      rows.push(
        [
          'tce_task',
          task.specialist,
          escape(task.title),
          escape(task.description),
          task.status,
          task.createdAt.toISOString(),
        ].join('\t'),
      );
    }

    for (const session of sessions) {
      rows.push(
        [
          'task_session',
          session.specialist,
          escape(session.taskDescription),
          escape(session.result ?? ''),
          session.status,
          session.createdAt.toISOString(),
        ].join('\t'),
      );
    }

    for (const req of prdRows) {
      rows.push(
        [
          'prd_requirement',
          'prd-evaluator',
          escape(req.requirementText),
          escape(JSON.stringify(req.flags ?? {})),
          req.satisfied ? 'pass' : 'fail',
          req.createdAt.toISOString(),
        ].join('\t'),
      );
    }

    return rows.join('\n');
  }
}
