'use client';
import { MarkdownRenderer } from '@/components/projects/documents/MarkdownRenderer';
import { NotebookCell, CellAccent, CellStatus } from './NotebookCell';
import type { SpecialistEntry } from '@/lib/agent-canvas.types';

interface WorkLogCellProps {
  specialist?: SpecialistEntry;
  specialistId: string;
  outcome: 'done' | 'needs_review' | 'blocked' | string;
  summary: string;
  docSection: string;
  defaultOpen?: boolean;
}

const OUTCOME: Record<string, { accent: CellAccent; status: CellStatus }> = {
  done: { accent: 'green', status: { label: 'Done', tone: 'done' } },
  needs_review: { accent: 'amber', status: { label: 'Review', tone: 'needs_review' } },
  blocked: { accent: 'red', status: { label: 'Blocked', tone: 'failed' } },
};

export function WorkLogCell({ specialist, specialistId, outcome, summary, docSection, defaultOpen = false }: WorkLogCellProps) {
  const meta = OUTCOME[outcome] ?? { accent: 'neutral' as CellAccent, status: { label: outcome, tone: 'idle' as const } };
  const name = specialist?.displayName ?? specialistId;
  return (
    <NotebookCell
      icon={
        <span
          className="flex size-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ backgroundColor: specialist?.colour ?? '#7C3AED' }}
        >
          {specialist?.monogram ?? name.slice(0, 2).toUpperCase()}
        </span>
      }
      title={name}
      subtitle={summary}
      accent={meta.accent}
      status={meta.status}
      defaultOpen={defaultOpen}
    >
      <MarkdownRenderer content={docSection} />
    </NotebookCell>
  );
}
