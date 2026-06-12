"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { visionInterviewStart, visionInterviewChat, initProjectVision, setProjectWorkflowType } from "@/lib/projects-api";
import { ChatInput } from "./vision-setup/ChatInput";
import { TaskOfferCard } from "./vision-setup/TaskOfferCard";
import { WorkflowSelectionModal, WorkflowType } from "./WorkflowSelectionModal";

interface VisionInterviewCanvasProps {
  projectId: string;
  projectName: string;
  projectDescription?: string;
  onVisionReady: (workflowType: 'autonomous' | 'canvas') => void;
}

export function VisionInterviewCanvas({
  projectId,
  projectName,
  projectDescription,
  onVisionReady,
}: VisionInterviewCanvasProps) {
  const pathname = usePathname();
  const [history, setHistory] = React.useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [pendingFreeText, setPendingFreeText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [noKey, setNoKey] = React.useState(false);
  
  const [suggestedTasks, setSuggestedTasks] = React.useState<string[]>([]);
  const [offeringTasks, setOfferingTasks] = React.useState(false);
  const [submittingTasks, setSubmittingTasks] = React.useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = React.useState(false);

  const startedRef = React.useRef(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (startedRef.current || !projectId || !projectName) return;
    startedRef.current = true;
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectName]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function startInterview() {
    setLoading(true);
    setNoKey(false);
    try {
      const res = await visionInterviewStart(projectId, projectName, projectDescription || "");
      const data = res.data.data;
      setSessionId(data.sessionId);
      setHistory([{ role: "assistant", content: data.message }]);
      
      if (data.visionReady) {
        handleVisionReady(data.suggestedTasks);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!sessionId || !pendingFreeText.trim()) return;
    
    const message = pendingFreeText.trim();
    setPendingFreeText("");
    const newHistory = [...history, { role: "user" as const, content: message }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await visionInterviewChat(projectId, sessionId, message);
      const data = res.data.data;
      
      setHistory([...newHistory, { role: "assistant", content: data.message }]);
      
      if (data.visionReady) {
        handleVisionReady(data.suggestedTasks);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleVisionReady(tasks?: string[]) {
    if (tasks && tasks.length > 0) {
      console.log("[VisionInterviewCanvas] Vision ready with", tasks.length, "suggested tasks — showing TaskOfferCard");
      setSuggestedTasks(tasks);
      setOfferingTasks(true);
    } else {
      console.log("[VisionInterviewCanvas] Vision ready — no suggested tasks, showing workflow modal");
      setShowWorkflowModal(true);
    }
  }

  function handleError(err: any) {
    const serverMsg: string = err?.response?.data?.message ?? "";
    const isNoKey =
      serverMsg.toLowerCase().includes("no llm key") ||
      serverMsg.toLowerCase().includes("not configured") ||
      serverMsg.toLowerCase().includes("add your api key") ||
      serverMsg.toLowerCase().includes("rejected the api key") ||
      serverMsg.toLowerCase().includes("leaked");
    if (isNoKey) {
      setNoKey(true);
    } else {
      const display = serverMsg || "Something went wrong. Please try again.";
      setHistory((h) => [...h, { role: "assistant", content: display }]);
    }
  }

  async function handleTaskConfirm(selected: string[]) {
    if (selected.length === 0) {
      console.log("[VisionInterviewCanvas] No tasks selected — skipping goal creation");
      setShowWorkflowModal(true);
      return;
    }
    setSubmittingTasks(true);
    console.log("[VisionInterviewCanvas] Creating", selected.length, "goals from selected tasks");
    try {
      await initProjectVision(projectId, {
        goals: selected.map((title) => ({ title, priority: 1 })),
      });
      console.log("[VisionInterviewCanvas] Goals created successfully");
    } catch (err) {
      console.warn("[VisionInterviewCanvas] Goal creation failed (non-fatal):", err);
    } finally {
      setSubmittingTasks(false);
      setOfferingTasks(false);
      setShowWorkflowModal(true);
    }
  }

  async function handleWorkflowSelect(workflowType: WorkflowType) {
    await setProjectWorkflowType(projectId, workflowType);
    onVisionReady(workflowType);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border/40 shrink-0">
        <p className="text-[13px] text-amber-400 font-medium uppercase tracking-wide">
          Vision Interview
        </p>
        <h2 className="text-lg font-semibold text-foreground leading-tight mt-0.5">
          {projectName}
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          Abigail is defining your project vision through a conversation.
        </p>
      </div>

      {noKey && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <KeyRound className="size-5 text-amber-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-foreground">LLM key required</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Abigail needs an API key for DeepSeek or Gemini. Add it and come back.
              </p>
            </div>
            <Link href={`/coding/settings/llm?returnTo=${encodeURIComponent(pathname)}`}>
              <Button className="w-full rounded-xl h-10 bg-amber-500 hover:bg-amber-400 text-black font-medium text-[14px]">
                Go to LLM Settings
              </Button>
            </Link>
            <button
              onClick={() => {
                setNoKey(false);
                startInterview();
              }}
              className="flex items-center gap-1.5 mx-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="size-3" />
              Already added a key? Try again
            </button>
          </div>
        </div>
      )}

      {!noKey && showWorkflowModal && (
        <div className="flex-1 overflow-hidden">
          <WorkflowSelectionModal
            projectId={projectId}
            onConfirm={handleWorkflowSelect}
          />
        </div>
      )}

      {!noKey && !showWorkflowModal && (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {history.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <span className="text-[11px] text-amber-400 font-medium mr-2 mt-2.5 shrink-0">
                  Abigail
                </span>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed max-w-[80%]",
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-muted/40 border border-border/40 whitespace-pre-wrap",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {offeringTasks && suggestedTasks.length > 0 && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TaskOfferCard
                tasks={suggestedTasks}
                onConfirm={handleTaskConfirm}
                loading={submittingTasks}
              />
            </div>
          )}

          {loading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <span className="text-[11px] text-amber-400 font-medium mr-2 mt-2.5 shrink-0">
                Abigail
              </span>
              <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground text-[15px]">
                <span className="animate-pulse">Thinking…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {!noKey && !offeringTasks && !showWorkflowModal && (
        <ChatInput
          value={pendingFreeText}
          onChange={setPendingFreeText}
          onSend={handleSend}
          disabled={loading || !sessionId}
          loading={loading}
        />
      )}
    </div>
  );
}
