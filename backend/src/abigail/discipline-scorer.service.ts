import { Injectable } from '@nestjs/common';
import { DisciplineReport } from './entities/task-session.entity';

@Injectable()
export class DisciplineScorerService {
  score(input: {
    result: string;
    files: Array<{ path: string; content: string }>;
    specialist: string;
    taskDescription: string;
    techStack: { forbidden: string[] };
  }): DisciplineReport {
    const { result, files, specialist, techStack } = input;
    const flags: string[] = [];
    const reports: Partial<DisciplineReport> = {
      tdd: null,
      debugging: null,
      architecture: null,
      completeness: null,
    };

    // 1. TDD Adherence (rex, nova, sage)
    if (['rex', 'nova', 'sage'].includes(specialist)) {
      const hasTestFile = files.some(
        (f) => f.path.endsWith('.spec.ts') || f.path.endsWith('.test.ts'),
      );

      // Find first code block
      const firstCodeBlockIndex = result.indexOf('```');
      const textBeforeCode =
        firstCodeBlockIndex !== -1
          ? result.substring(0, firstCodeBlockIndex)
          : result;
      const hasTestKeywords =
        textBeforeCode.includes('describe(') || textBeforeCode.includes('it(');

      reports.tdd = hasTestFile || hasTestKeywords ? 1.0 : 0.0;
      if (reports.tdd === 0)
        flags.push('Missing test files or test descriptions (TDD)');
    }

    // 2. Systematic Debugging (pixel, felix, vex)
    if (['pixel', 'felix', 'vex'].includes(specialist)) {
      const firstCodeBlockIndex = result.indexOf('```');
      const textBeforeCode =
        firstCodeBlockIndex !== -1
          ? result.substring(0, firstCodeBlockIndex)
          : result;
      const hasDebugSignals =
        textBeforeCode.includes('Root cause:') ||
        textBeforeCode.includes('## Analysis') ||
        textBeforeCode.includes('because');

      reports.debugging = hasDebugSignals ? 1.0 : 0.0;
      if (reports.debugging === 0)
        flags.push('Missing explicit root cause analysis (Debugging)');
    }

    // 3. Architecture Discipline (rex, nova, atlas, orion)
    if (['rex', 'nova', 'atlas', 'orion'].includes(specialist)) {
      let violated = false;
      const forbiddenLibs = techStack?.forbidden ?? [];

      for (const file of files) {
        for (const lib of forbiddenLibs) {
          // Simple regex for import/require of forbidden lib
          const importRegex = new RegExp(
            `from\\s+['"]${lib}['"]|require\\(['"]${lib}['"]\\)`,
            'i',
          );
          if (importRegex.test(file.content)) {
            flags.push(
              `Forbidden library import detected: ${lib} in ${file.path}`,
            );
            violated = true;
          }
        }
      }
      reports.architecture = violated ? 0.0 : 1.0;
    }

    // 4. Output Completeness (all)
    // Coding specialists output files; general/research specialists output text.
    const FILE_SPECIALISTS = [
      'rex',
      'nova',
      'sage',
      'atlas',
      'orion',
      'kai',
      'pixel',
      'felix',
      'vex',
    ];
    if (FILE_SPECIALISTS.includes(specialist)) {
      const hasFiles = files.length > 0;
      const avgLength = hasFiles
        ? files.reduce((acc, f) => acc + f.content.length, 0) / files.length
        : 0;
      reports.completeness = hasFiles && avgLength > 200 ? 1.0 : 0.0;
      if (reports.completeness === 0) {
        if (!hasFiles) flags.push('No files were produced in the output');
        else flags.push('Produced files are too short or incomplete');
      }
    } else {
      reports.completeness = result.length > 200 ? 1.0 : 0.0;
      if (reports.completeness === 0)
        flags.push('Output text is too short or empty');
    }

    // Calculate Overall
    const applicableScores = [
      reports.tdd,
      reports.debugging,
      reports.architecture,
      reports.completeness,
    ].filter((s): s is number => s !== null);

    const overall =
      applicableScores.length > 0
        ? applicableScores.reduce((acc, s) => acc + s, 0) /
          applicableScores.length
        : 0;

    return {
      tdd: reports.tdd ?? null,
      debugging: reports.debugging ?? null,
      architecture: reports.architecture ?? null,
      completeness: reports.completeness ?? null,
      flags,
      overall,
    };
  }
}
