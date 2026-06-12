"use client";

import * as React from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCodingStore } from "@/lib/coding-store";
import { fetchOrgChart } from "@/lib/abigail-api";
import type { Agent } from "@/lib/abigail-api";
import type { SpecialistId } from "@/lib/coding-store";

function statusColor(status: Agent["status"]) {
  if (status === "active") return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
  if (status === "thinking") return "bg-orange-500 animate-pulse";
  return "bg-muted-foreground/30";
}

export function TeamSidebar() {
  const { selectedSpecialist, setSelectedSpecialist } = useCodingStore();
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchOrgChart()
      .then((res) => setAgents(res.data.data))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-background/50 overflow-hidden">
      <div className="p-4 space-y-6">
        <Button
          className="w-full justify-between bg-muted/40 hover:bg-muted/60 border-border/40 text-foreground rounded-xl h-11 px-4"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <span className="font-medium text-[15px]">Hire Specialist</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono opacity-50">Alt+H</span>
        </Button>

        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-medium text-muted-foreground">Specialist Team</span>
          <span className="px-2 py-0.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground">
            {loading ? "..." : agents.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {agents.map((agent) => {
          const isSelected = selectedSpecialist === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() =>
                setSelectedSpecialist(isSelected ? null : (agent.id as SpecialistId))
              }
              className={cn(
                "group p-4 rounded-2xl border border-border/40 transition-all cursor-pointer",
                isSelected
                  ? "bg-muted/60 border-primary/30"
                  : "bg-muted/20 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-10 rounded-xl flex items-center justify-center border border-border/40 bg-background transition-colors",
                  agent.status === "active" ? "border-emerald-500/20 text-emerald-500" : "text-muted-foreground",
                )}>
                  <span className="text-[13px] font-bold uppercase">{agent.name.slice(0, 2)}</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-[14px] font-medium text-foreground/90 truncate leading-none mb-1">
                    {agent.name}
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", statusColor(agent.status))} />
                    <p className="text-[12px] text-muted-foreground font-light truncate">
                      {agent.role}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <span className="text-[10px] text-primary font-medium">selected</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
