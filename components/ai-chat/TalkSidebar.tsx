"use client";

import * as React from "react";
import { History, Star, Ghost, Search, MessageSquareIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { fetchAgentIssues } from "@/lib/abigail-api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function TalkSidebar() {
  const [search, setSearch] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["talk-sessions"],
    queryFn: () =>
      fetchAgentIssues({ status: "done", limit: 30 }).then((r) => r.data.data),
    staleTime: 60_000,
    retry: 2,
  });

  const sessions = (data?.data ?? []).filter((s) =>
    search.trim() === "" || s.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full h-full flex flex-col bg-background/50 overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted/20 border-border/40 focus:bg-muted/40 transition-all rounded-xl h-10"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Recent</span>
          </div>
          <Star className="size-4 text-muted-foreground/40 hover:text-orange-500 cursor-pointer transition-colors" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-3 py-3 rounded-xl animate-pulse">
              <div className="h-3.5 w-36 rounded bg-muted/60 mb-1.5" />
              <div className="h-2.5 w-48 rounded bg-muted/40" />
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className="pt-8 pb-4 flex flex-col items-center justify-center text-center opacity-40">
            <MessageSquareIcon className="size-8 mb-2" />
            <p className="text-[11px] font-medium uppercase tracking-tighter">
              {search ? "No matches" : "No sessions yet"}
            </p>
          </div>
        ) : (
          <>
            {sessions.map((s) => (
              <div
                key={s.id}
                className="group px-3 py-3 rounded-xl hover:bg-muted/40 transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col overflow-hidden">
                    <h4 className="text-[14px] font-medium text-foreground/90 truncate">
                      {s.title}
                    </h4>
                    <p className="text-[12px] text-muted-foreground truncate font-light mt-0.5">
                      {s.domain ?? "General"} • {s.assigneeAgentId}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap mt-1">
                    {timeAgo(s.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-8 pb-4 flex flex-col items-center justify-center text-center opacity-20">
              <Ghost className="size-8 mb-2" />
              <p className="text-[11px] font-medium uppercase tracking-tighter">No more history</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
