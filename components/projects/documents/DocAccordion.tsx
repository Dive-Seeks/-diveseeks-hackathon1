'use client';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialistDocument } from '@/hooks/useSpecialistDocuments';

interface Props {
  doc: SpecialistDocument;
  isOpen: boolean;
  onToggle: () => void;
  accentColour: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DocAccordion({ doc, isOpen, onToggle, accentColour }: Props) {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border transition-colors',
        isOpen ? 'border-[var(--accent)]/40' : 'border-border/40',
      )}
      style={{ '--accent': accentColour } as React.CSSProperties}
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
          isOpen ? 'bg-[var(--accent)]/10' : 'bg-card hover:bg-muted/30',
        )}
        style={isOpen ? { borderTop: `2px solid ${accentColour}` } : { borderTop: '2px solid transparent' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOpen
            ? <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            : <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
          }
          <span className={cn('text-[11px] font-semibold truncate', isOpen ? 'text-foreground' : 'text-muted-foreground')}>
            {doc.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[9px] text-muted-foreground/60">v{doc.version}</span>
          <Clock className="size-2.5 text-muted-foreground/40" />
          <span className="text-[9px] text-muted-foreground/60">{timeAgo(doc.updatedAt)}</span>
        </div>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-card/50 border-t border-border/30">
          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-foreground/70 break-words">
            {doc.content}
          </pre>
        </div>
      )}
    </div>
  );
}
