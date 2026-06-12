"use client";

import * as React from "react";
import { ActivityIcon, RefreshCwIcon, FilterIcon, AlertCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { useAbigailChat } from "@/hooks/useAbigailChat";
import { fetchActivityLog } from "@/lib/abigail-api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "What happened today?", icon: ActivityIcon },
  { label: "Show errors", icon: FilterIcon },
  { label: "Agent activity summary", icon: ActivityIcon },
];

const PAGE_SIZE = 30;

function actionColor(action: string): string {
  if (action.startsWith("dispatch")) return "bg-blue-500/15 text-blue-400";
  if (action.startsWith("heartbeat")) return "bg-purple-500/15 text-purple-400";
  if (action.startsWith("issue")) return "bg-green-500/15 text-green-400";
  if (action.startsWith("budget")) return "bg-yellow-500/15 text-yellow-400";
  if (action.startsWith("error")) return "bg-red-500/15 text-red-400";
  return "bg-muted/60 text-muted-foreground";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function payloadSummary(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const keys = Object.keys(payload).filter((k) => !["tenantId", "id"].includes(k));
  if (keys.length === 0) return null;
  return keys
    .slice(0, 2)
    .map((k) => {
      const v = payload[k];
      const vStr = typeof v === "object" ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40);
      return `${k}: ${vStr}`;
    })
    .join("  ·  ");
}

export default function ActivityFeedPage() {
  const { messages, send, isLoading: chatLoading } = useAbigailChat();
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const [page, setPage] = React.useState(1);

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["activity-log", tenantId, page],
    queryFn: () => fetchActivityLog(tenantId!, page, PAGE_SIZE).then((r) => r.data.data),
    enabled: !!tenantId,
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 2,
  });

  const entries = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ChatCanvas
      greeting="Activity Feed"
      subtitle="A live log of everything Abigail and your specialists are doing."
      suggestions={SUGGESTIONS}
      onSend={send}
    >
      <div className="max-w-3xl mx-auto w-full space-y-4 py-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <ActivityIcon className="size-4" />
            <span>{total} events</span>
          </div>
          <button
            onClick={() => refetch()}
            className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <RefreshCwIcon className={cn("size-4", isFetching && "animate-spin")} />
          </button>
          <span className="text-[11px] text-muted-foreground">Auto-refreshes every 15s</span>
        </div>

        {isError ? (
          <div className="text-center py-12 rounded-2xl bg-red-500/5 border border-red-500/20">
            <AlertCircleIcon className="size-8 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-medium mb-1">Failed to load activity</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
              {error instanceof Error ? error.message : "Could not reach the activity log endpoint."}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-1.5 text-[13px] rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : isFetching && entries.length === 0 ? (
          <div className="rounded-2xl bg-muted/20 border border-border/40 overflow-hidden divide-y divide-border/20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 animate-pulse">
                <div className="h-5 w-20 rounded-full bg-muted/60 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-muted/60" />
                  <div className="h-2.5 w-48 rounded bg-muted/40" />
                </div>
                <div className="h-2.5 w-10 rounded bg-muted/40 shrink-0" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-muted/20 border border-border/40">
            <ActivityIcon className="size-8 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-medium mb-1">No activity yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Events appear here as soon as Abigail starts dispatching tasks.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/20 border border-border/40 overflow-hidden divide-y divide-border/20">
            {entries.map((entry) => {
              const summary = payloadSummary(entry.payload);
              return (
                <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-muted/10 transition-colors">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium font-mono",
                      actionColor(entry.action),
                    )}
                  >
                    {entry.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{entry.actor}</p>
                    {summary && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{summary}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                    {timeAgo(entry.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-[13px] rounded-lg bg-muted/40 text-muted-foreground hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[13px] text-muted-foreground">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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
        {chatLoading && (
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
