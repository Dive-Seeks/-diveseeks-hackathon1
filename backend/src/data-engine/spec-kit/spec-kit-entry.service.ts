import { Injectable } from '@nestjs/common';
import {
  SpecKitLifecycleService,
  SpecKitLifecycleResult,
} from './spec-kit-lifecycle.service';
import { SpecKitFolderService } from './spec-kit-folder.service';
import { SpecKitTaskMapper } from './spec-kit-task-mapper.service';
import { SpecKitAuditBridgeService } from './spec-kit-audit-bridge.service';
import { SpecKitConstitutionGuard } from './spec-kit-constitution.guard';
import { TCETask } from '../../tce/entities/tce-task.entity';

export interface SpecKitGenerateParams {
  projectId: string;
  tenantId: string;
  taskDescription: string;
  clarificationAnswers?: Record<string, string>;
  visionSummary?: string;
  team?: string;
}

/**
 * Single published entry point for all spec-kit operations.
 * No caller outside data-engine/ should inject individual spec-kit services directly.
 */
@Injectable()
export class SpecKitEntryService {
  constructor(
    private readonly lifecycle: SpecKitLifecycleService,
    private readonly folder: SpecKitFolderService,
    private readonly taskMapper: SpecKitTaskMapper,
    private readonly audit: SpecKitAuditBridgeService,
    private readonly constitutionGuard: SpecKitConstitutionGuard,
  ) {}

  /** Run the spec-kit clarify → spec → plan → tasks lifecycle. */
  async generate(
    params: SpecKitGenerateParams,
  ): Promise<SpecKitLifecycleResult> {
    return this.lifecycle.run(params);
  }

  /** Read one spec-kit file by relative path (e.g. 'specs/current/spec.md'). */
  async read(projectId: string, relativePath: string): Promise<string | null> {
    return this.folder.readSpecKitFile(projectId, relativePath);
  }

  /** Read one spec-kit file by relative path with caching. */
  async readCached(
    projectId: string,
    relativePath: string,
  ): Promise<string | null> {
    return this.folder.readSpecKitFileCached(projectId, relativePath);
  }

  /** Write content to a spec-kit file by relative path. */
  async write(
    projectId: string,
    relativePath: string,
    content: string,
  ): Promise<void> {
    return this.folder.writeSpecKitFile(projectId, relativePath, content);
  }

  async generateConstitution(projectId: string): Promise<void> {
    return this.folder.generateConstitution(projectId);
  }

  /** Map existing spec → list of task seed objects ready for TCE task creation. */
  async seedTasks(projectId: string, tenantId: string): Promise<TCETask[]> {
    return this.taskMapper.mapToTceTasks({ projectId, tenantId });
  }

  /** Returns the task titles declared in tasks.md for the project, or [] if file missing. */
  async getTaskTitlesFromFile(projectId: string): Promise<string[]> {
    return this.taskMapper.getTaskTitlesFromFile(projectId);
  }

  /** Write a spec-kit audit record (called after a session completes). */
  async recordAudit(params: {
    projectId: string;
    tenantId: string;
    sessionId: string;
    specialist: string;
    taskDescription: string;
    outcome: 'pass' | 'fail' | 'needs_review';
    disciplineOverall: number;
    disciplineFlags: string[];
  }): Promise<void> {
    return this.audit.record(params);
  }

  /**
   * Check whether an operation is permitted by the project constitution.
   * Returns { allowed: boolean, reason?: string }.
   */
  async checkConstitution(
    projectId: string,
    taskDescription: string,
    fileNames?: string[],
  ): Promise<{ allowed: boolean; violations: string[] }> {
    return this.constitutionGuard.check({
      projectId,
      taskDescription,
      fileNames,
    });
  }
}
