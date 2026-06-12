"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface AttributeBadgeProps {
  icon: string;
  label: string;
  selected?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: "sm" | "md";
  inherited?: boolean;
}

export function AttributeBadge({
  icon,
  label,
  selected = false,
  removable = false,
  onClick,
  onRemove,
  size = "md",
  inherited = false,
}: AttributeBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-3 py-1 text-xs",
        selected &&
          "bg-muted border-foreground/40 text-foreground hover:bg-muted/80",
        !selected &&
          !inherited &&
          "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted hover:border-border",
        inherited &&
          "bg-muted/30 border-border/20 text-muted-foreground cursor-default",
        !onClick && !removable && "cursor-default"
      )}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {inherited && (
        <span className="text-[9px] opacity-60 ml-0.5">(inherited)</span>
      )}
      {removable && onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
        >
          <X className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );
}
