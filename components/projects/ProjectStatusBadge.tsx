"use client";

import * as React from "react";
import { useProjectCompletion } from "@/hooks/useProjectCompletion";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function ProjectStatusBadge({ projectId }: Props) {
  const { card, isLoading } = useProjectCompletion(projectId);

  if (isLoading) {
    return <Loader2 className="size-3 animate-spin text-muted-foreground ml-2 inline" />;
  }

  if (!card || !card.status || card.status === "not_started") return null;

  let label = card.status.replace(/_/g, " ");
  let colorClass = "bg-muted text-muted-foreground border-border/40"; // default

  switch (card.status) {
    case "running":
      label = "Running";
      colorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";
      break;
    case "waiting_for_agents":
      label = "Agents Working";
      colorClass = "bg-amber-500/10 text-amber-500 border-amber-500/20";
      break;
    case "waiting_for_review":
      label = "Review Ready";
      colorClass = "bg-purple-500/10 text-purple-500 border-purple-500/20";
      break;
    case "waiting_for_user_approval":
      label = "Needs Approval";
      colorClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
      break;
    case "blocked":
      label = "Blocked";
      colorClass = "bg-red-500/10 text-red-500 border-red-500/20";
      break;
    case "updating":
      label = "Updating";
      colorClass = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      break;
    case "completed":
      label = "Completed";
      colorClass = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      break;
    case "cancelled":
      label = "Cancelled";
      colorClass = "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
      break;
  }

  return (
    <Badge variant="outline" className={`ml-2 text-[10px] px-1.5 py-0 uppercase tracking-wider font-bold ${colorClass}`}>
      {label}
    </Badge>
  );
}
