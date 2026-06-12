"use client";

import * as React from "react";
import type { CardBlock } from "@/types/vision-setup-envelope";

interface FreeTextCardProps {
  card: Extract<CardBlock, { kind: "free_text" }>;
}

export function FreeTextCard({ card }: FreeTextCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
      <p className="text-[14px] font-medium text-foreground">{card.question}</p>
      <p className="text-[11px] text-muted-foreground italic">{card.placeholder}</p>
    </div>
  );
}
