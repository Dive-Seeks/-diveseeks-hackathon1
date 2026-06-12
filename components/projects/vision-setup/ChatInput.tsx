"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  loading: boolean;
  sendLabel?: string;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  loading,
  sendLabel = "Send",
  placeholder = "Type a custom answer or click an option above",
}: ChatInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !loading) onSend();
    }
  }

  return (
    <div className="px-6 py-3 border-t border-border/40 shrink-0">
      <div className="flex gap-2 items-end rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 focus-within:border-border/80 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none max-h-[120px] leading-relaxed"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
        <button
          onClick={onSend}
          disabled={disabled || loading}
          aria-label={sendLabel}
          className={cn(
            "shrink-0 size-8 rounded-xl flex items-center justify-center transition-colors",
            !disabled && !loading
              ? "bg-foreground text-background hover:bg-foreground/80"
              : "bg-muted/40 text-muted-foreground cursor-not-allowed",
          )}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
