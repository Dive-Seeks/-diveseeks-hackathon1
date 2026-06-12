'use client';
import { DocsNotebook } from '@/components/projects/docs/notebook/DocsNotebook';

interface Props {
  projectId: string;
  team: 'coding' | 'general' | 'research';
  onDocOpen?: (docTitle: string, snippet: string) => void;
}

export function DocumentsPanel({ projectId, team }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <DocsNotebook projectId={projectId} team={team} />
    </div>
  );
}
