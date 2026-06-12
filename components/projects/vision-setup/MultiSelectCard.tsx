"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/vision-setup-envelope";

interface MultiSelectCardProps {
  card: Extract<CardBlock, { kind: "multi_select" }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function MultiSelectCard({ card, selectedIds, onToggle }: MultiSelectCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
      <p className="text-[14px] font-medium text-foreground">{card.question}</p>
      <p className="text-[11px] text-muted-foreground">
        Pick {card.minSelected}–{card.maxSelected}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {card.options.map((opt) => {
          const checked = selectedIds.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={cn(
                "text-left rounded-xl border p-3 transition-colors flex items-start gap-2",
                checked
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-border/40 bg-background hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded border mt-0.5 flex items-center justify-center shrink-0",
                  checked ? "bg-amber-500 border-amber-500" : "border-border",
                )}
              >
                {checked && <span className="text-[10px] text-background">✓</span>}
              </span>
              <p className="text-[13px] text-foreground">{opt.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
