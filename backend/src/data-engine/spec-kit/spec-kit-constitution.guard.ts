import { Injectable, Logger } from '@nestjs/common';
import { SpecKitFolderService } from './spec-kit-folder.service';

export interface ConstitutionCheckResult {
  allowed: boolean;
  violations: string[];
}

@Injectable()
export class SpecKitConstitutionGuard {
  private readonly logger = new Logger(SpecKitConstitutionGuard.name);

  constructor(private readonly folder: SpecKitFolderService) {}

  async check(params: {
    projectId: string;
    taskDescription: string;
    fileNames?: string[];
  }): Promise<ConstitutionCheckResult> {
    const constitution = await this.folder.readSpecKitFile(
      params.projectId,
      'memory/constitution.md',
    );

    if (!constitution) {
      // No constitution yet — allow through, lifecycle service will generate it
      return { allowed: true, violations: [] };
    }

    const violations: string[] = [];
    const desc = params.taskDescription.toLowerCase();
    const files = (params.fileNames ?? []).map((f) => f.toLowerCase());

    // Extract forbidden stack entries from constitution
    const forbiddenMatch = constitution.match(
      /##\s*(?:forbidden|never\s+use)[^\n]*\n([\s\S]*?)(?=\n##|\s*$)/i,
    );
    if (forbiddenMatch) {
      const forbiddenLines = forbiddenMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);

      for (const lib of forbiddenLines) {
        const libLower = lib.toLowerCase();
        if (
          desc.includes(libLower) ||
          files.some((f) => f.includes(libLower))
        ) {
          violations.push(`Forbidden library/tech referenced: "${lib}"`);
        }
      }
    }

    // Extract hard constraints (lines under "## Constraints" section)
    const constraintsMatch = constitution.match(
      /##\s*Constraints[^\n]*\n([\s\S]*?)(?=\n##|\s*$)/i,
    );
    if (constraintsMatch) {
      const constraintLines = constraintsMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);

      for (const constraint of constraintLines) {
        // Only flag if constraint contains explicit negation keywords
        const isNegative =
          /\b(never|do not|must not|prohibited|forbidden|no\s+direct)\b/i.test(
            constraint,
          );
        if (!isNegative) continue;

        // Extract what is prohibited — keyword after the negation verb
        const prohibitedMatch = constraint.match(
          /(?:never|do not|must not|no\s+direct)\s+([\w\s]+)/i,
        );
        if (prohibitedMatch) {
          const prohibited = prohibitedMatch[1].trim().toLowerCase();
          if (desc.includes(prohibited)) {
            violations.push(`Constraint violated: "${constraint}"`);
          }
        }
      }
    }

    if (violations.length > 0) {
      this.logger.warn(
        `[SpecKitConstitutionGuard] ${violations.length} violation(s) for project ${params.projectId}: ${violations.join(' | ')}`,
      );
    }

    return { allowed: violations.length === 0, violations };
  }
}
