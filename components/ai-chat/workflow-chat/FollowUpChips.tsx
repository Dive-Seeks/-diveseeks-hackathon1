'use client';
import { ArrowUp } from 'lucide-react';

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function FollowUpChips({ suggestions, onSelect }: FollowUpChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-muted/20 text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/40 transition-all active:scale-95"
        >
          <ArrowUp className="size-3 shrink-0" />
          {s}
        </button>
      ))}
    </div>
  );
}
