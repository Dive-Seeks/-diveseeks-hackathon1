"use client";

import * as React from "react";
import { FileText, Pencil, Lightbulb, FolderPlusIcon, ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { useAbigailChat } from "@/hooks/useAbigailChat";
import { useCodingStore } from "@/lib/coding-store";

const SUGGESTIONS = [
  { label: "Summarize something", icon: FileText },
  { label: "Write or draft", icon: Pencil },
  { label: "Brainstorm ideas", icon: Lightbulb },
];

function NoProjectBanner({ team }: { team: string }) {
  const router = useRouter();
  return (
    <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="rounded-2xl bg-muted/20 border border-border/40 p-6 flex flex-col items-center text-center gap-4">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderPlusIcon className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold mb-1">No project selected</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Abigail needs a project to route your tasks to the right specialists. Create one to get started.
          </p>
        </div>
        <button
          onClick={() => router.push(`/${team}/projects`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors"
        >
          Create your first project
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}

export default function GeneralDashboardPage() {
  const { messages, send, isLoading } = useAbigailChat({ team: "general" });
  const activeProject = useCodingStore((s) => s.activeProjects["general"]);

  return (
    <ChatCanvas
      greeting="What can I help you with today?"
      subtitle="Echo, Lyra, Spark and the team are ready."
      suggestions={SUGGESTIONS}
      onSend={send}
    >
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {!activeProject && messages.length === 0 && <NoProjectBanner team="general" />}

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
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
      </div>
    </ChatCanvas>
  );
}
