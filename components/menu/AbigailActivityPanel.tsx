"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { AbigailState, ActiveSpecialist } from "@/hooks/use-wizard-activity";

const ABIGAIL_IMAGE = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces&q=80";

const SPECIALIST_IMAGES: Record<string, string> = {
  zara:  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces&q=80",
  marco: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=100&h=100&fit=crop&crop=faces&q=80",
  kai:   "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces&q=80",
  rex:   "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces&q=80",
  sage:  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces&q=80",
};

const STATE_DOT: Record<AbigailState, { color: string; label: string } | null> = {
  idle:       null,
  thinking:   { color: 'bg-muted-foreground',  label: 'thinking...' },
  planning:   { color: 'bg-muted-foreground',  label: 'planning with team...' },
  waiting:    { color: 'bg-muted-foreground',  label: 'waiting for team...' },
  responding: { color: 'bg-foreground',        label: 'responding...' },
};

interface AbigailActivityPanelProps {
  abigailState: AbigailState;
  activeSpecialists: ActiveSpecialist[];
  selectedStoreCount: number;
}

export function AbigailActivityPanel({
  abigailState,
  activeSpecialists,
  selectedStoreCount,
}: AbigailActivityPanelProps) {
  const dot = STATE_DOT[abigailState];

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/30 shrink-0">
      <Avatar size="sm" className="ring-1 ring-border shrink-0">
        <AvatarImage src={ABIGAIL_IMAGE} alt="Abigail" />
        <AvatarFallback className="bg-muted text-foreground font-bold">A</AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">Abigail</p>
        <p className="text-[10px] text-muted-foreground leading-tight">AI Menu Coordinator</p>
        {dot && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", dot.color)} />
            <span className="text-[10px] text-muted-foreground">{dot.label}</span>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {activeSpecialists.length > 0 && (
          <div className="flex items-end gap-1">
            {activeSpecialists.map((s, i) => (
              <div
                key={s.name}
                className={cn(
                  "flex flex-col items-center gap-0.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-1",
                  i > 0 && "-ml-2"
                )}
                style={{ zIndex: activeSpecialists.length - i }}
              >
                <Avatar size="sm" className="w-7 h-7 ring-1 ring-border/50 shadow-sm">
                  <AvatarImage src={SPECIALIST_IMAGES[s.name]} alt={s.name} />
                  <AvatarFallback className="text-[10px] font-bold bg-muted">
                    {s.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[9px] text-muted-foreground leading-none">
                  {s.state}
                </span>
              </div>
            ))}
          </div>
        )}

        {selectedStoreCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[10px] font-medium shrink-0">
            🤖 {selectedStoreCount}
          </div>
        )}
      </div>
    </div>
  );
}
