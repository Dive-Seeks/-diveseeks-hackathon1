'use client';
import * as React from 'react';
import { BookPlus, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getIdentity } from '@/lib/specialist-identities';
import { useSpecialistDocuments } from '@/hooks/useSpecialistDocuments';

const SAVEABLE_SPECIALISTS = ['rex', 'nova', 'kai', 'felix', 'sage', 'atlas', 'orion', 'pixel', 'luma', 'vex'];

interface SaveToDocDropdownProps {
  content: string;
  projectId: string;
}

export function SaveToDocDropdown({ content, projectId }: SaveToDocDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { create, isCreating } = useSpecialistDocuments(projectId);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const save = (specialistId: string) => {
    const title = content.slice(0, 60).replace(/\n/g, ' ').trim();
    create(
      { specialistId, title, content, documentType: 'chat-reply' },
      {
        onSuccess: () => {
          setSaved(true);
          setOpen(false);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isCreating}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
          saved
            ? 'border-green-500/40 bg-green-500/10 text-green-500'
            : 'border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40',
        )}
      >
        {saved ? <Check className="size-3" /> : <BookPlus className="size-3" />}
        {saved ? 'Saved!' : isCreating ? 'Saving…' : 'Save to Doc'}
        {!saved && !isCreating && <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />}
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 w-52 rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/20">
            Save as new doc for
          </div>
          {SAVEABLE_SPECIALISTS.map(key => {
            const entry = getIdentity(key);
            return (
              <button
                key={key}
                onClick={() => save(key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: entry.colour }}
                >
                  {entry.monogram}
                </div>
                <span className="text-[12px] text-foreground">{entry.displayName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
