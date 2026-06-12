import { VisionFile } from './vision.types';

export class VisionDocumentRenderer {
  render(vision: VisionFile): string {
    const sections: string[] = [];

    sections.push(`# Vision: ${vision.name}`);
    if (vision.description) sections.push(`\n${vision.description}`);

    // Constitution — governing principles (spec-kit style)
    const constitutionLines: string[] = ['## Constitution'];

    const locked = vision.techStack?.locked ?? [];
    const forbidden = vision.techStack?.forbidden ?? [];
    const frontend = vision.techStack?.frontend ?? [];
    const backend = vision.techStack?.backend ?? [];
    const infra = vision.techStack?.infra ?? [];

    if (locked.length > 0)
      constitutionLines.push(`**Locked Tech:** ${locked.join(', ')}`);
    if (forbidden.length > 0)
      constitutionLines.push(`**Forbidden Tech:** ${forbidden.join(', ')}`);
    if (frontend.length > 0)
      constitutionLines.push(`**Frontend:** ${frontend.join(', ')}`);
    if (backend.length > 0)
      constitutionLines.push(`**Backend:** ${backend.join(', ')}`);
    if (infra.length > 0)
      constitutionLines.push(`**Infrastructure:** ${infra.join(', ')}`);

    if (constitutionLines.length > 1) {
      sections.push('\n' + constitutionLines.join('\n'));
    }

    // Goals as structured prose
    if (vision.goals && vision.goals.length > 0) {
      sections.push('\n## Goals');
      for (const goal of vision.goals) {
        const progressStr =
          goal.status === 'complete'
            ? 'complete'
            : `${goal.status} — ${goal.progress}%`;
        sections.push(`\n### Goal: ${goal.title} [${progressStr}]`);
        sections.push(`${goal.description}`);
        if (goal.tasks && goal.tasks.length > 0) {
          sections.push('\n**Tasks:**');
          for (const task of goal.tasks) {
            sections.push(`- ${task}`);
          }
        }
      }
    }

    // Constraints
    if (vision.constraints && vision.constraints.length > 0) {
      sections.push('\n## Constraints');
      for (const constraint of vision.constraints) {
        sections.push(`- ${constraint}`);
      }
    }

    // Open Questions
    if (vision.openQuestions && vision.openQuestions.length > 0) {
      sections.push('\n## Open Questions');
      for (const q of vision.openQuestions) {
        sections.push(`- ${q}`);
      }
    }

    return sections.join('\n');
  }
}
