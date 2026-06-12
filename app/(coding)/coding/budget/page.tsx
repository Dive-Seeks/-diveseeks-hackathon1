"use client";

import * as React from "react";
import {
  TrendingUpIcon,
  Wallet,
  BarChart3,
  ZapIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { useAbigailChat } from "@/hooks/useAbigailChat";
import { fetchSpendSummary, fetchSpendEvents } from "@/lib/abigail-api";
import type { SpendSummary, TokenSpendEvent } from "@/lib/abigail-api";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { label: "Efficiency report", icon: BarChart3 },
  { label: "Budget forecast", icon: Wallet },
  { label: "Cost by model", icon: ZapIcon },
];

interface ModelRow {
  provider: string;
  model: string;
  totalTokens: number;
  costCents: number;
  eventCount: number;
}

function aggregateByModel(events: TokenSpendEvent[]): ModelRow[] {
  const map = new Map<string, ModelRow>();
  for (const e of events) {
    const key = `${e.provider}::${e.model}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalTokens += e.totalTokens;
      existing.costCents += e.costCents;
      existing.eventCount += 1;
    } else {
      map.set(key, {
        provider: e.provider,
        model: e.model,
        totalTokens: e.totalTokens,
        costCents: e.costCents,
        eventCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.costCents - a.costCents);
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function BudgetPage() {
  const { messages, send, isLoading } = useAbigailChat();
  const [summary, setSummary] = React.useState<SpendSummary | null>(null);
  const [events, setEvents] = React.useState<TokenSpendEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState(false);

  React.useEffect(() => {
    Promise.all([fetchSpendSummary(), fetchSpendEvents(50)])
      .then(([summaryRes, eventsRes]) => {
        setSummary(summaryRes.data.data);
        setEvents(eventsRes.data.data.data);
      })
      .catch((err) => {
        console.error("Budget fetch failed:", err);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const pct = summary
    ? Math.min((summary.spentCents / Math.max(summary.monthlyLimitCents, 1)) * 100, 100)
    : 0;
  const modelRows = aggregateByModel(events);

  return (
    <ChatCanvas
      greeting="Budget & Efficiency"
      subtitle="Monitoring the resource footprint and ROI of your AI development."
      suggestions={SUGGESTIONS}
      onSend={send}
    >
      <div className="max-w-3xl mx-auto w-full space-y-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="mx-auto size-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <TrendingUpIcon className="size-6 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">Loading budget data...</p>
          </div>
        ) : summary ? (
          <>
            {summary.paused && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                <AlertCircleIcon className="size-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400 font-medium">Budget paused — LLM calls are blocked until unpaused.</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Spent this month", value: formatCents(summary.spentCents), icon: TrendingUpIcon, highlight: false },
                { label: "Monthly limit", value: formatCents(summary.monthlyLimitCents), icon: Wallet, highlight: false },
                { label: "Remaining", value: formatCents(summary.remainingCents), icon: CheckCircleIcon, highlight: summary.remainingCents < summary.monthlyLimitCents * 0.1 },
              ].map(({ label, value, icon: Icon, highlight }) => (
                <div key={label} className="rounded-2xl bg-muted/20 border border-border/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("size-4", highlight ? "text-red-400" : "text-muted-foreground")} />
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
                  </div>
                  <p className="text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-muted/20 border border-border/40 p-4 space-y-3">
              <div className="flex justify-between text-[13px] text-muted-foreground">
                <span>Monthly usage</span>
                <span>{pct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted/40 rounded-full h-2.5">
                <div
                  className={cn(
                    "h-2.5 rounded-full transition-all",
                    pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Window: {new Date(summary.windowStart).toLocaleDateString()} – {new Date(summary.windowEnd).toLocaleDateString()}
              </p>
            </div>

            {modelRows.length > 0 && (
              <div className="rounded-2xl bg-muted/20 border border-border/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                  <BarChart3 className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Per-model breakdown</h3>
                </div>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border/40">
                      <th className="px-4 py-2 font-normal">Model</th>
                      <th className="px-4 py-2 font-normal text-right">Tokens</th>
                      <th className="px-4 py-2 font-normal text-right">Cost</th>
                      <th className="px-4 py-2 font-normal text-right">Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelRows.map((row) => (
                      <tr key={`${row.provider}::${row.model}`} className="border-b border-border/20 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] text-muted-foreground mr-1.5 uppercase">{row.provider}</span>
                          <span className="font-mono text-[12px]">{row.model}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatTokens(row.totalTokens)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-primary">{formatCents(row.costCents)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.eventCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {events.length > 0 && (
              <div className="rounded-2xl bg-muted/20 border border-border/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                  <ZapIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Recent spend events</h3>
                </div>
                <div className="divide-y divide-border/20">
                  {events.slice(0, 20).map((e) => (
                    <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                      <span className="text-[11px] bg-muted/60 rounded px-1.5 py-0.5 font-mono uppercase text-muted-foreground shrink-0">
                        {e.provider}
                      </span>
                      <span className="flex-1 font-mono text-[12px] truncate">{e.model}</span>
                      <span className="tabular-nums text-muted-foreground">{formatTokens(e.totalTokens)} tok</span>
                      <span className="tabular-nums text-primary font-medium">{formatCents(e.costCents)}</span>
                      <span className="text-muted-foreground text-[11px] shrink-0">{timeAgo(e.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {events.length === 0 && modelRows.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No spend events yet — tasks will appear here once agents start working.</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {fetchError ? "Failed to load budget data — check your connection." : "No budget data available."}
            </p>
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
