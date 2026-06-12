"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Wand2, Search, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type Status =
  | "pending"
  | "analyzing"
  | "generating"
  | "completed"
  | "approved"
  | "rejected"
  | "failed";

const statusConfig: Record<
  Status,
  { label: string; icon: typeof Loader2; className: string; animate?: boolean }
> = {
  pending: {
    label: "Queued",
    icon: Loader2,
    className: "bg-muted text-muted-foreground border-border",
    animate: true,
  },
  analyzing: {
    label: "Analyzing",
    icon: Search,
    className: "bg-muted text-muted-foreground border-border",
    animate: true,
  },
  generating: {
    label: "Generating",
    icon: Wand2,
    className: "bg-muted text-muted-foreground border-border",
    animate: true,
  },
  completed: {
    label: "Ready",
    icon: Camera,
    className: "bg-muted text-foreground border-border",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-muted text-foreground border-border",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function GenerationStatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border",
        config.className,
      )}
    >
      <Icon
        className={cn("size-3 mr-1", config.animate && "animate-spin")}
        strokeWidth={2.5}
      />
      {config.label}
    </Badge>
  );
}
