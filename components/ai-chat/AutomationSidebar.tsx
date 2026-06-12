"use client";

import * as React from "react";
import { Settings2, WorkflowIcon, AlertCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchAgentIssues } from "@/lib/abigail-api";
import { cn } from "@/lib/utils";

function statusColor(status: string) {
  if (status === "in_progress") return "bg-emerald-500";
  if (status === "assigned") return "bg-blue-500";
  if (status === "waiting_approval") return "bg-yellow-500";
  return null;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AutomationSidebar() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["agent-issues-automation"],
    queryFn: () =>
      fetchAgentIssues({ limit: 20 }).then((r) => r.data.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });

  const issues = data?.data ?? [];

  return (
    <div className="w-full h-full flex flex-col bg-background/50 overflow-hidden">
      <div className="p-4 space-y-6">
        <Button
          className="w-full justify-between bg-muted/40 hover:bg-muted/60 border-border/40 text-foreground rounded-xl h-11 px-4"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="size-4" />
            <span className="font-medium text-[15px]">New Workflow</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono opacity-50">Alt+W</span>
        </Button>

        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-medium text-muted-foreground">Automations</span>
          {!isLoading && (
            <span className="px-2 py-0.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground">
              {issues.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
        {isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircleIcon className="size-5 text-red-400" />
            <p className="text-[12px] text-muted-foreground">Failed to load automations.</p>
            <button
              onClick={() => refetch()}
              className="text-[12px] text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-border/40 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-muted/60 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-32 rounded bg-muted/60" />
                  <div className="h-2.5 w-20 rounded bg-muted/40" />
                </div>
              </div>
            </div>
          ))
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <WorkflowIcon className="size-6 text-muted-foreground/40" />
            <p className="text-[12px] text-muted-foreground">No active automations yet.</p>
          </div>
        ) : (
          issues.map((issue) => {
            const dot = statusColor(issue.status);
            return (
              <div
                key={issue.id}
                className="group p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-colors">
                    <WorkflowIcon className="size-4 text-primary/80" />
                  </div>
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[14px] font-medium text-foreground/90 truncate">
                        {issue.title}
                      </h4>
                      {dot && (
                        <span className={cn("size-1.5 rounded-full shrink-0 animate-pulse", dot)} />
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground font-light truncate">
                      {issue.domain ?? "General"} • {statusLabel(issue.status)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
