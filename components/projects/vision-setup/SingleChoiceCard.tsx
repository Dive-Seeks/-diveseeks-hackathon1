"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CardBlock } from "@/types/vision-setup-envelope";

interface SingleChoiceCardProps {
  card: Extract<CardBlock, { kind: "single_choice" }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SingleChoiceCard({ card, selectedId, onSelect }: SingleChoiceCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
      <p className="text-[14px] font-medium text-foreground">{card.question}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {card.options.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "text-left rounded-xl border p-3 transition-colors hover:bg-muted/40",
              selectedId === opt.id
                ? "border-amber-500 bg-amber-500/10"
                : "border-border/40 bg-background",
            )}
          >
            <p className="text-[13px] font-medium text-foreground">
              {String.fromCharCode(65 + i)}. {opt.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">{opt.rationale}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
