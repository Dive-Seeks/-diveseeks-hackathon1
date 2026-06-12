'use client';
import { X, ExternalLink } from 'lucide-react';
import { getIdentity } from '@/lib/specialist-identities';
import type { Citation } from './types';

interface SourcesDrawerProps {
  citations: Citation[];
  onClose: () => void;
  onOpenDoc: (title: string, snippet: string) => void;
}

export function SourcesDrawer({ citations, onClose, onOpenDoc }: SourcesDrawerProps) {
  return (
    <div className="w-80 shrink-0 border-l border-border/40 bg-background flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span className="text-[13px] font-semibold text-foreground">Sources</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {citations.map(cit => {
          const entry = getIdentity(cit.specialistId);
          return (
            <div key={cit.id} className="rounded-lg border border-border/30 bg-muted/20 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.colour }} />
                <span className="text-[11px] text-muted-foreground">{entry.displayName}</span>
              </div>
              <p className="text-[12px] font-medium text-foreground leading-snug">{cit.title}</p>
              {cit.snippet && (
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2">
                  "{cit.snippet}"
                </p>
              )}
              <button
                onClick={() => onOpenDoc(cit.title, cit.snippet)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                Open doc
              </button>
            </div>
          );
        })}
        {citations.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-4">No sources cited.</p>
        )}
      </div>
    </div>
  );
}
