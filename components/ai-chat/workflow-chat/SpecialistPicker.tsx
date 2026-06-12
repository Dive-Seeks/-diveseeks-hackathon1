'use client';
import * as React from 'react';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPECIALIST_IDENTITIES, getIdentity } from '@/lib/specialist-identities';

const PICKABLE_KEYS = ['rex', 'nova', 'kai', 'felix', 'sage', 'atlas', 'orion', 'pixel', 'luma', 'vex'];

interface SpecialistPickerProps {
  selected: string[];
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function SpecialistPicker({ selected, onSelect, onClose }: SpecialistPickerProps) {
  const [query, setQuery] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = PICKABLE_KEYS.filter(key => {
    if (!query) return true;
    const entry = getIdentity(key);
    const q = query.toLowerCase();
    return entry.displayName.toLowerCase().includes(q) || (entry.speciality ?? '').toLowerCase().includes(q);
  });

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 w-64 rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search specialists..."
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.map(key => {
          const entry = getIdentity(key);
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => { onSelect(key); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
            >
              <div
                className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: entry.colour }}
              >
                {entry.monogram}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-foreground">{entry.displayName}</div>
                <div className="text-[10px] text-muted-foreground truncate">{entry.speciality}</div>
              </div>
              {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-3">No match</p>
        )}
      </div>
    </div>
  );
}
