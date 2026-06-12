"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AbigailSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function AbigailSuggestions({ suggestions, onSelect }: AbigailSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 pb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <p className="text-[10px] text-muted-foreground mb-1.5">Abigail suggests:</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 2).map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s)}
            className={cn(
              "text-[11px] px-3 py-1.5 rounded-full border border-border/60 bg-muted/40",
              "text-foreground hover:bg-muted/80 hover:border-border transition-all",
              "max-w-[200px] truncate text-left"
            )}
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
