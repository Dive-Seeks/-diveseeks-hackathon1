"use client";

import * as React from "react";
import { Play, Zap, History, WorkflowIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { AutomationSidebar } from "@/components/ai-chat/AutomationSidebar";

const SUGGESTIONS = [
  { label: "Run active workflows", icon: Play },
  { label: "Optimize triggers", icon: Zap },
  { label: "View automation history", icon: History },
];

export default function AutomationPage() {
  const [messages, setMessages] = React.useState<any[]>([]);

  const send = (msg: string) => {
    setMessages([...messages, { role: "user", content: msg }]);
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      <div className="w-[30%] min-w-[280px] max-w-[400px] shrink-0 border-r border-border/40 overflow-hidden">
        <AutomationSidebar />
      </div>
      <div className="flex-1">
        <ChatCanvas
          greeting="Automation"
          subtitle="Manage and monitor Abigail's autonomous background tasks."
          suggestions={SUGGESTIONS}
          onSend={send}
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto size-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                  <WorkflowIcon className="size-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No active automations</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Start a new task or define a workflow trigger to see Abigail in action.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[85%] text-[15px] leading-relaxed",
                    m.role === "user" 
                      ? "bg-foreground text-background" 
                      : "bg-muted/40 border border-border/40"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </ChatCanvas>
      </div>
    </div>
  );
}
