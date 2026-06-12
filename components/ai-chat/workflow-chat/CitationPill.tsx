'use client';
import { getIdentity } from '@/lib/specialist-identities';
import type { Citation } from './types';

interface CitationPillProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export function CitationPill({ citation, onClick }: CitationPillProps) {
  const entry = getIdentity(citation.specialistId);
  return (
    <button
      onClick={() => onClick(citation)}
      className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded border border-border/40 bg-muted/60 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors align-baseline"
      title={citation.snippet}
    >
      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: entry.colour }} />
      {citation.title}
    </button>
  );
}
