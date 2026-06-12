"use client";

import * as React from "react";
import { Zap, Filter, Loader2 } from "lucide-react";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { useAbigailChat } from "@/hooks/useAbigailChat";
import { fetchEvolutionEvents } from "@/lib/abigail-api";
import type { EvolutionEvent } from "@/lib/abigail-api";

const SUGGESTIONS = [
  { label: "Explain last evolution", icon: Zap },
  { label: "Which specialist improved most?", icon: Filter },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function EvolvePage() {
  const { messages, send, isLoading } = useAbigailChat();
  const [events, setEvents] = React.useState<EvolutionEvent[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetchEvolutionEvents({ limit: 20 })
      .then((res) => setEvents(res.data.data.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ChatCanvas
      greeting="Evolve Engine"
      subtitle="Track how Abigail's specialists self-improve over time."
      suggestions={SUGGESTIONS}
      onSend={send}
    >
      <div className="max-w-3xl mx-auto w-full space-y-6 py-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="size-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No evolution cycles yet. Cycles trigger after 10 approved tasks.</p>
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-2xl bg-muted/20 border border-border/40 px-4 py-3 flex items-center gap-3"
            >
              <Zap className="size-4 text-primary shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="text-[14px] font-medium text-foreground/90 capitalize">{ev.domain}</p>
                <p className="text-[12px] text-muted-foreground">{formatDate(ev.created_at)}</p>
              </div>
            </div>
          ))
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex animate-in fade-in duration-300 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-[15px] leading-relaxed ${
              m.role === "user" ? "bg-foreground text-background" : "bg-muted/40 border border-border/40"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground animate-pulse text-[15px]">
              Thinking...
            </div>
          </div>
        )}
      </div>
    </ChatCanvas>
  );
}
