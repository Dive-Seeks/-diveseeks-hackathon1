"use client";

import * as React from "react";
import { Sparkles, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MentionInput } from "./workflow-chat/MentionInput";
import type { ModelTier } from "./workflow-chat/types";

interface Suggestion {
  label: string;
  icon: LucideIcon;
}

interface ChatCanvasProps {
  greeting: string;
  subtitle: string;
  suggestions?: Suggestion[];
  placeholder?: string;
  children?: React.ReactNode;
  onSend?: (message: string) => void;
  onSendWithContext?: (message: string, contextFilter: string[], modelTier: ModelTier) => void;
  initialHasMessages?: boolean;
  hasMessagesOverride?: boolean;
}

export function ChatCanvas({
  greeting,
  subtitle,
  suggestions = [],
  placeholder = "Ask anything...",
  children,
  onSend,
  onSendWithContext,
  initialHasMessages = false,
  hasMessagesOverride,
}: ChatCanvasProps) {
  const [input, setInput] = React.useState("");
  const [hasMessages, setHasMessages] = React.useState(initialHasMessages);
  const [contextFilter, setContextFilter] = React.useState<string[]>([]);
  const [modelTier, setModelTier] = React.useState<ModelTier>("balanced");

  const effectiveHasMessages =
    hasMessagesOverride !== undefined ? hasMessagesOverride : hasMessages;

  const handleSend = (message: string, cf: string[], mt: ModelTier) => {
    if (!message.trim()) return;
    if (onSendWithContext) {
      onSendWithContext(message, cf, mt);
    } else {
      onSend?.(message);
    }
    setHasMessages(true);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      <div className="flex-1 overflow-y-auto scroll-smooth">
        {!effectiveHasMessages ? (
          <div className="min-h-full flex flex-col items-center justify-center gap-8 px-4 max-w-[800px] mx-auto w-full py-12">
            <div className="space-y-4 text-center animate-in fade-in zoom-in-95 duration-700">
              <h1 className="text-[2.25rem] font-medium text-foreground tracking-tight leading-tight">
                {greeting}
              </h1>
              <p className="text-muted-foreground/70 text-lg font-light tracking-wide">
                {subtitle}
              </p>
            </div>

            <div className="w-full max-w-[760px]">
              <MentionInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                contextFilter={contextFilter}
                onContextFilterChange={setContextFilter}
                modelTier={modelTier}
                onModelTierChange={setModelTier}
                placeholder={placeholder}
              />
            </div>

            {suggestions.length > 0 && (
              <div className="flex items-center gap-2.5 flex-wrap justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                {suggestions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(label, contextFilter, modelTier)}
                    className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-muted/20 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/10 hover:bg-muted/40 transition-all active:scale-95"
                  >
                    <Icon className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {children && <div className="w-full mt-8">{children}</div>}
          </div>
        ) : (
          <div className="p-4 space-y-4">{children}</div>
        )}
      </div>

      {effectiveHasMessages && (
        <div className="shrink-0 px-4 py-6 max-w-[800px] mx-auto w-full">
          <MentionInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            contextFilter={contextFilter}
            onContextFilterChange={setContextFilter}
            modelTier={modelTier}
            onModelTierChange={setModelTier}
            placeholder={placeholder}
          />
          <p className="text-[10px] text-center text-muted-foreground/60 mt-3 tracking-wide">
            Abigail can make mistakes. Check important info.
          </p>
        </div>
      )}
    </div>
  );
}
