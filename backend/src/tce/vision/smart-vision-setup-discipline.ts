import { VisionTurnEnvelope } from './vision-setup-envelope.types';

export type DisciplineViolation =
  | 'one_question_per_turn'
  | 'card_required_on_question'
  | 'no_invented_tech'
  | 'no_invented_constraints'
  | 'section_order_enforced'
  | 'vision_ready_completeness';

export interface DisciplineResult {
  envelope: VisionTurnEnvelope;
  violations: DisciplineViolation[];
}

function flattenConversation(history: string[]): string {
  return history.join(' \n ').toLowerCase();
}

export function applyVisionSetupDiscipline(
  envelope: VisionTurnEnvelope,
  conversationTextHistory: string[],
): DisciplineResult {
  const violations: DisciplineViolation[] = [];
  let modified = { ...envelope, visionTable: { ...envelope.visionTable } };

  // Rule 1: one_question_per_turn
  const questionMarkCount = (envelope.abigailMessage.match(/\?/g) || []).length;
  if (questionMarkCount >= 2) {
    violations.push('one_question_per_turn');
  }

  // Rule 2: card_required_on_question
  if (envelope.abigailMessage.trim().endsWith('?') && envelope.card === null) {
    violations.push('card_required_on_question');
  }

  // Rule 3: no_invented_tech — strip locked techs not in conversation
  const conversationText = flattenConversation(conversationTextHistory);
  const filteredLocked = envelope.visionTable.techStack.locked.filter((item) =>
    conversationText.includes(item.toLowerCase()),
  );
  if (filteredLocked.length !== envelope.visionTable.techStack.locked.length) {
    violations.push('no_invented_tech');
    modified.visionTable = {
      ...modified.visionTable,
      techStack: {
        ...modified.visionTable.techStack,
        locked: filteredLocked,
      },
    };
  }

  // Rule 4: no_invented_constraints
  const filteredConstraints = envelope.visionTable.constraints.filter(
    (c) =>
      conversationText.includes(c.toLowerCase().slice(0, 30)) || c.length < 10,
  );
  if (filteredConstraints.length !== envelope.visionTable.constraints.length) {
    violations.push('no_invented_constraints');
    modified.visionTable = {
      ...modified.visionTable,
      constraints: filteredConstraints,
    };
  }

  // Rule 6: vision_ready_completeness
  if (envelope.visionReady) {
    const t = envelope.visionTable;
    const hasDescription = !!t.description && t.description.length > 10;
    const hasGoal = t.goals.length >= 1;
    // Tech stack is optional for non-software projects (tech_stack status confirmed but arrays empty is valid)
    const techStackConfirmed = t.status?.tech_stack === 'confirmed';
    const hasStack =
      t.techStack.locked.length +
        t.techStack.frontend.length +
        t.techStack.backend.length >
      0;
    const stackOk = hasStack || techStackConfirmed;
    if (!hasDescription || !hasGoal || !stackOk) {
      violations.push('vision_ready_completeness');
      modified = { ...modified, visionReady: false, finalVision: undefined };
    }
  }

  // Rule 7: force visionReady when all 5 status fields are confirmed and LLM forgot to set it
  if (!modified.visionReady && modified.visionTable?.status) {
    const s = modified.visionTable.status;
    const allConfirmed =
      s.description === 'confirmed' &&
      s.tech_stack === 'confirmed' &&
      s.first_goal === 'confirmed' &&
      s.constraints === 'confirmed' &&
      s.open_questions === 'confirmed';
    if (allConfirmed) {
      const t = modified.visionTable;
      const hasDescription = !!t.description && t.description.length > 10;
      const hasGoal = t.goals.length >= 1;
      // Tech stack confirmed but empty arrays is valid for non-software projects
      const hasStack =
        t.techStack.locked.length +
          t.techStack.frontend.length +
          t.techStack.backend.length >
        0;
      const stackOk = hasStack || s.tech_stack === 'confirmed';
      if (hasDescription && hasGoal && stackOk) {
        modified = {
          ...modified,
          visionReady: true,
          finalVision: modified.visionTable as any,
        };
      }
    }
  }

  return { envelope: modified, violations };
}
