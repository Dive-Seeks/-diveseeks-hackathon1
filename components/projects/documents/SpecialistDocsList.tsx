'use client';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPECIALIST_IDENTITIES } from '@/lib/specialist-identities';
import type { SpecialistDocument } from '@/hooks/useSpecialistDocuments';

interface Props {
  team: 'coding' | 'general' | 'research';
  docsBySpecialist: Record<string, SpecialistDocument[]>;
  activeSpecialistId: string | null;
  expandedSpecialists: Set<string>;
  onSelectSpecialist: (id: string) => void;
  onSelectDoc: (id: string) => void;
}

export function SpecialistDocsList({
  team,
  docsBySpecialist,
  activeSpecialistId,
  expandedSpecialists,
  onSelectSpecialist,
  onSelectDoc,
}: Props) {
  const specialists = Object.entries(SPECIALIST_IDENTITIES)
    .filter(([, v]) => v.team === team)
    .sort(([idA], [idB]) => {
      const aHas = (docsBySpecialist[idA]?.length ?? 0) > 0;
      const bHas = (docsBySpecialist[idB]?.length ?? 0) > 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return 0;
    });

  return (
    <>
      <div className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Specialists
      </div>
      {specialists.map(([id, identity]) => {
        const docs = docsBySpecialist[id] ?? [];
        const isExpanded = expandedSpecialists.has(id);
        const isActive = activeSpecialistId === id;

        return (
          <div key={id}>
            <button
              onClick={() => onSelectSpecialist(id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                isActive ? 'bg-muted/40' : 'hover:bg-muted/20',
              )}
              style={isActive ? { borderLeft: `2px solid ${identity.colour}` } : { borderLeft: '2px solid transparent' }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                style={{ background: identity.colour }}
              >
                {identity.monogram}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn('text-[11px]', isActive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                  {identity.displayName}
                </div>
                <div className="text-[9px] text-muted-foreground/50">
                  {docs.length} {docs.length === 1 ? 'doc' : 'docs'}
                </div>
              </div>
              {isExpanded
                ? <ChevronDown className="size-2.5 shrink-0 text-muted-foreground/40" />
                : <ChevronRight className="size-2.5 shrink-0 text-muted-foreground/40" />
              }
            </button>

            {isExpanded && docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                className="w-full px-3 py-1.5 pl-9 text-left text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors truncate border-l-2 border-transparent"
              >
                {doc.title}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}
