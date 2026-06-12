"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import type { CardBlock } from "@/types/vision-setup-envelope";

interface ConfirmationCardProps {
  card: Extract<CardBlock, { kind: "confirmation" }>;
}

export function ConfirmationCard({ card }: ConfirmationCardProps) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" />
        <p className="text-[14px] font-medium">{card.title}</p>
      </div>
      <p className="text-[13px] text-muted-foreground">{card.body}</p>
      {card.capturedFields.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Captured: {card.capturedFields.join(", ")}
        </p>
      )}
    </div>
  );
}
