"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MegaphoneIcon,
  SendIcon,
  BotIcon,
  UserIcon,
  Loader2Icon,
  StopCircleIcon,
  SparklesIcon,
  ArrowUpIcon,
  Wand2Icon,
  MailIcon,
  LayoutIcon,
  ImageIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const SUGGESTIONS = [
  {
    icon: MegaphoneIcon,
    label: "Facebook Ad",
    prompt: "Write a Facebook ad for my restaurant promoting a weekend lunch special.",
  },
  {
    icon: Wand2Icon,
    label: "Google Ads",
    prompt: "Create a Google Ads headline for my retail store holiday sale.",
  },
  {
    icon: LayoutIcon,
    label: "Landing Page",
    prompt: "Generate a landing page hero section for my food ordering site.",
  },
  {
    icon: ImageIcon,
    label: "Instagram Captions",
    prompt: "Write 5 Instagram captions for a new menu launch.",
  },
  {
    icon: MailIcon,
    label: "Promo Email",
    prompt: "Draft a promotional email for my loyalty customers.",
  },
  {
    icon: FileTextIcon,
    label: "Product Description",
    prompt: "Create a product description for a seasonal special.",
  },
];

export default function MarketingBuilderPage() {
  const { accessToken } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/ai-integration/chat/marketing`,
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background font-sans overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-5 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <MegaphoneIcon className="size-4.5" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-tight">
              Marketing AI
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Ads · Copy · Campaigns
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[11px] font-medium"
        >
          <SparklesIcon className="size-3 fill-primary text-primary" />
          Marketing Mode
        </Badge>
      </header>

      {/* ── Message list ────────────────────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {isEmpty ? (
            <EmptyState onSuggestionClick={setInput} />
          ) : (
            <div className="flex flex-col gap-6 pb-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              {status === "submitted" && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Input bar ───────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 pt-3 pb-4">
        <div className="mx-auto max-w-3xl">
          <div
            className={cn(
              "relative flex flex-col gap-2 rounded-2xl border bg-card shadow-sm transition-all duration-200",
              "focus-within:border-border"
            )}
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the ad, content, or campaign you need…"
              className="min-h-[52px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 px-4 pt-3.5 pb-1 text-[14.5px] bg-transparent leading-relaxed text-foreground placeholder:text-muted-foreground"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="flex items-center justify-between px-3 pb-2.5">
              <span className="text-[11px] text-muted-foreground select-none">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                to send &middot;{" "}
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  Shift+Enter
                </kbd>{" "}
                new line
              </span>

              {isLoading ? (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => stop()}
                  className="size-8 rounded-xl shrink-0"
                  aria-label="Stop generating"
                >
                  <StopCircleIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="size-8 rounded-xl shrink-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-40 transition-all"
                  aria-label="Send message"
                >
                  <ArrowUpIcon className="size-4" strokeWidth={2.5} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-10 pb-6">
      {/* Icon hero */}
      <div className="relative mb-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm">
          <MegaphoneIcon className="size-7" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <SparklesIcon className="size-3 fill-current" />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-foreground tracking-tight text-balance">
        Marketing AI Assistant
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed text-pretty">
        Write ads, landing pages, email campaigns, and social content in seconds.
        Pick a suggestion below or describe what you need.
      </p>

      {/* Suggestions Grid */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 w-full">
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => onSuggestionClick(s.prompt)}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-primary">
                <Icon className="size-4" />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground/80 transition-colors">
                {s.prompt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted border text-foreground"
        )}
      >
        {isUser ? <UserIcon className="size-4" /> : <BotIcon className="size-4" />}
      </div>
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/50 border text-foreground rounded-tl-sm"
        )}
      >
        {message.parts?.map((part: any, i: number) =>
          part.type === "text" ? <span key={i} className="whitespace-pre-wrap">{part.text}</span> : null
        ) || <span className="whitespace-pre-wrap">{message.content || message.text}</span>}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex w-full gap-4 flex-row">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted border text-foreground shadow-sm">
        <BotIcon className="size-4" />
      </div>
      <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-tl-sm bg-muted/50 border px-4 py-3 text-[14.5px] text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin text-primary" />
        Generating content...
      </div>
    </div>
  );
}
