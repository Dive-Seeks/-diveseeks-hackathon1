"use client";

import * as React from "react";
import { CpuIcon, ClockIcon, UserIcon, RefreshCwIcon } from "lucide-react";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { useAbigailChat } from "@/hooks/useAbigailChat";
import { fetchAgentIssues } from "@/lib/abigail-api";
import type { AgentIssueRow, IssueStatus } from "@/lib/abigail-api";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "Show active tasks", icon: CpuIcon },
  { label: "What's in review?", icon: ClockIcon },
  { label: "Who's working on what?", icon: UserIcon },
];

const STATUS_STYLES: Record<IssueStatus, string> = {
  todo: "bg-muted/60 text-muted-foreground",
  assigned: "bg-blue-500/15 text-blue-400",
  in_progress: "bg-blue-500/20 text-blue-300",
  in_review: "bg-yellow-500/15 text-yellow-400",
  waiting_approval: "bg-yellow-500/20 text-yellow-300",
  done: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
  cancelled: "bg-red-500/10 text-red-500/70",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: "Todo",
  assigned: "Assigned",
  in_progress: "In Progress",
  in_review: "In Review",
  waiting_approval: "Awaiting Approval",
  done: "Done",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function TaskQueuePage() {
  const { messages, send, isLoading } = useAbigailChat();
  const [issues, setIssues] = React.useState<AgentIssueRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const load = React.useCallback(
    (p: number, status: string) => {
      setLoading(true);
      fetchAgentIssues({
        status: status === "all" ? undefined : status,
        page: p,
        limit: 20,
      })
        .then((res) => {
          const body = res.data.data;
          setIssues(body.data ?? []);
          setTotal(body.total ?? 0);
        })
        .catch((err) => {
          console.error("Task queue fetch failed:", err);
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  React.useEffect(() => {
    load(1, statusFilter);
    setPage(1);
  }, [statusFilter, load]);

  const FILTER_TABS = [
    { label: "All", value: "all" },
    { label: "Active", value: "in_progress" },
    { label: "Review", value: "in_review" },
    { label: "Done", value: "done" },
  ];

  return (
    <ChatCanvas
      greeting="Task Queue"
      subtitle="All agent issues — what Abigail and your specialists are working on right now."
      suggestions={SUGGESTIONS}
      onSend={send}
    >
      <div className="max-w-3xl mx-auto w-full space-y-4 py-8">
        <div className="flex items-center gap-2">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[13px] transition-colors",
                statusFilter === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
              )}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => load(page, statusFilter)}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
          </button>
          <span className="text-[12px] text-muted-foreground">{total} total</span>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <CpuIcon className="size-8 text-muted-foreground mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading task queue...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-muted/20 border border-border/40">
            <CpuIcon className="size-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-medium mb-1">No tasks yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Tasks appear here once Abigail dispatches work to specialists.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/20 border border-border/40 overflow-hidden divide-y divide-border/20">
            {issues.map((issue) => (
              <div key={issue.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_STYLES[issue.status],
                    )}
                  >
                    {STATUS_LABELS[issue.status]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium leading-snug truncate">{issue.title}</p>
                    {issue.description && (
                      <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{issue.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {issue.domain && (
                        <span className="text-[11px] bg-muted/60 rounded px-1.5 py-0.5 text-muted-foreground">
                          {issue.domain}
                        </span>
                      )}
                      {issue.goalAncestry && (
                        <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                          Goal: {issue.goalAncestry.goalTitle}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                        {timeAgo(issue.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                {issue.goalAncestry && (
                  <div className="mt-2 ml-16 rounded-lg bg-muted/30 border border-border/30 px-3 py-2 text-[12px] text-muted-foreground">
                    <span className="text-foreground/70 font-medium">Why: </span>
                    {issue.goalAncestry.goalDescription || issue.goalAncestry.goalTitle}
                    {issue.goalAncestry.projectName && (
                      <span className="ml-2 text-[11px]">— {issue.goalAncestry.projectName}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); load(p, statusFilter); }}
              className="px-3 py-1.5 text-[13px] rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[13px] text-muted-foreground">Page {page} of {Math.ceil(total / 20)}</span>
            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => { const p = page + 1; setPage(p); load(p, statusFilter); }}
              className="px-3 py-1.5 text-[13px] rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex animate-in fade-in duration-300 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-[15px] leading-relaxed ${
              m.role === "user" ? "bg-foreground text-background" : "bg-muted/40 border border-border/40"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground text-[15px]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ChatCanvas>
  );
}
