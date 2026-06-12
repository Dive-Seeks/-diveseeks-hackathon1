"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageQueueProps {
  queuedMessage: string | null;
  onCancel: () => void;
  flash: boolean;
}

export function MessageQueue({ queuedMessage, onCancel, flash }: MessageQueueProps) {
  if (!queuedMessage) return null;

  return (
    <div
      className={cn(
        "mx-3 mb-1 px-3 py-2 rounded-xl border border-border bg-muted flex items-start gap-2 transition-all duration-200",
        flash && "ring-2 ring-border scale-[1.01]"
      )}
    >
      <span className="text-base leading-none shrink-0 mt-0.5">⏳</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium leading-tight mb-0.5">
          Abigail is working... your message is queued:
        </p>
        <p className="text-xs text-foreground truncate">
          &ldquo;{queuedMessage}&rdquo;
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        aria-label="Cancel queued message"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
