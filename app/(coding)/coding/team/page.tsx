"use client";

import * as React from "react";
import { UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { TeamSidebar } from "@/components/ai-chat/TeamSidebar";
import { useAbigailChat } from "@/hooks/useAbigailChat";

const SUGGESTIONS = [
  { label: "What is Rex working on?", icon: UsersIcon },
];

export default function TeamPage() {
  const { messages, send, isLoading } = useAbigailChat();

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      <div className="w-[30%] min-w-[280px] max-w-[400px] shrink-0 border-r border-border/40 overflow-hidden">
        <TeamSidebar />
      </div>
      <div className="flex-1">
        <ChatCanvas
          greeting="Specialist Team"
          subtitle="Select a specialist from the sidebar to direct your message, or ask Abigail to route it."
          suggestions={SUGGESTIONS}
          onSend={send}
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto size-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                  <UsersIcon className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Your team is standing by</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Select a specialist from the sidebar or start a conversation to begin.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    {m.role === "assistant" && m.specialist && (
                      <span className="text-[11px] text-muted-foreground font-medium capitalize px-1">
                        {m.specialist}
                      </span>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                        m.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-muted/40 border border-border/40 whitespace-pre-wrap",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground text-[15px]">
                  <span className="animate-pulse">Specialist is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ChatCanvas>
      </div>
    </div>
  );
}
