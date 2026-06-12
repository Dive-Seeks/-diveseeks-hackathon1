"use client";

import * as React from "react";
import { Sparkles, Wand2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { TaskSidebar } from "@/components/ai-chat/TaskSidebar";
import { useAbigailChat } from "@/hooks/useAbigailChat";

const SUGGESTIONS = [
  { label: "New logic gap", icon: Sparkles },
  { label: "Feature implementation", icon: Wand2 },
  { label: "Refactoring task", icon: Lightbulb },
];

export default function NewTaskPage() {
  const { messages, send, isLoading } = useAbigailChat();

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      <div className="w-[30%] min-w-[280px] max-w-[400px] shrink-0 border-r border-border/40 overflow-hidden">
        <TaskSidebar />
      </div>
      <div className="flex-1 bg-background">
        <ChatCanvas
          greeting="New Task"
          subtitle="Define a new technical objective for Abigail to execute."
          suggestions={SUGGESTIONS}
          onSend={send}
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.map((m, i) => (
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
            ))}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground text-[15px]">
                  <span className="animate-pulse">Abigail is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ChatCanvas>
      </div>
    </div>
  );
}
