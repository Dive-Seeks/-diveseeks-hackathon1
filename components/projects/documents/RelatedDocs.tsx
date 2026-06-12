'use client';
import { getIdentity } from '@/lib/specialist-identities';
import { useRelatedDocs } from '@/hooks/useRelatedDocs';
import type { DocSummary } from '@/hooks/useRelatedDocs';

interface RelatedDocsProps {
  projectId: string;
  docId: string;
  onOpen: (doc: DocSummary) => void;
}

export function RelatedDocs({ projectId, docId, onOpen }: RelatedDocsProps) {
  const { data: docs, isLoading } = useRelatedDocs(projectId, docId);

  if (isLoading) {
    return <p className="text-[11px] text-muted-foreground animate-pulse p-3">Loading related docs…</p>;
  }

  if (!docs?.length) {
    return <p className="text-[11px] text-muted-foreground/50 p-3">No related documents found.</p>;
  }

  return (
    <div className="space-y-2 p-3">
      {docs.map(doc => {
        const entry = getIdentity(doc.specialistId);
        return (
          <button
            key={doc.id}
            onClick={() => onOpen(doc)}
            className="w-full text-left rounded-lg border border-border/30 bg-muted/20 p-3 hover:bg-muted/40 transition-colors space-y-1"
          >
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: entry.colour }} />
              <span className="text-[10px] text-muted-foreground">{entry.displayName}</span>
            </div>
            <p className="text-[12px] font-medium text-foreground">{doc.title}</p>
            <p className="text-[11px] text-muted-foreground/60 line-clamp-2">
              {doc.content.slice(0, 100)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
