"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { CardBlock } from "@/types/vision-setup-envelope";

interface YesNoCardProps {
  card: Extract<CardBlock, { kind: "yes_no" }>;
  onAnswer: (yes: boolean) => void;
}

export function YesNoCard({ card, onAnswer }: YesNoCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
      <p className="text-[14px] font-medium text-foreground">{card.question}</p>
      <p className="text-[12px] text-muted-foreground">{card.rationale}</p>
      <div className="flex gap-3">
        <Button
          onClick={() => onAnswer(true)}
          className="flex-1 rounded-xl h-10 bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          ✓ Yes
        </Button>
        <Button
          onClick={() => onAnswer(false)}
          variant="outline"
          className="flex-1 rounded-xl h-10"
        >
          ✕ No
        </Button>
      </div>
    </div>
  );
}
