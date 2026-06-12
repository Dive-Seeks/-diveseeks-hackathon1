"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket-context";
import { cn } from "@/lib/utils";

interface TaskProgressEvent {
  sessionId: string;
  tenantId: string;
  userId: string;
  step: string;
  stepIndex: number;
  totalSteps: number;
  agentName: string;
  status: "running" | "done" | "failed" | "queued";
  message?: string;
}

const STATUS_ICONS: Record<TaskProgressEvent["status"], string> = {
  running: "◎",
  done: "✓",
  failed: "✗",
  queued: "…",
};

const STATUS_COLORS: Record<TaskProgressEvent["status"], string> = {
  running: "text-blue-500",
  done: "text-green-500",
  failed: "text-red-500",
  queued: "text-yellow-500",
};

interface Props {
  sessionId: string;
  /** Called when the pipeline reaches 'done' or 'failed' */
  onComplete?: (status: "done" | "failed") => void;
}

export function TaskProgressBar({ sessionId, onComplete }: Props) {
  const [progress, setProgress] = useState<TaskProgressEvent | null>(null);
  const [history, setHistory] = useState<TaskProgressEvent[]>([]);
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !sessionId) return;
    
    function handleProgress(event: TaskProgressEvent) {
      if (event.sessionId !== sessionId) return;

      setProgress(event);
      setHistory((prev) => {
        // Replace existing entry for same step or append
        const existing = prev.findIndex((e) => e.step === event.step);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = event;
          return next;
        }
        return [...prev, event];
      });

      if (event.step === "done" && event.status === "done") {
        onComplete?.("done");
      }
      if (event.status === "failed") {
        onComplete?.("failed");
      }
    }

    socket.on("task_progress", handleProgress);
    return () => { socket.off("task_progress", handleProgress); };
  }, [sessionId, onComplete, socket]);

  if (!progress) return null;

  const pct = Math.round((progress.stepIndex / progress.totalSteps) * 100);
  const isQueued = progress.status === "queued";

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {isQueued ? "Task queued" : `${progress.agentName} is working…`}
        </span>
        {!isQueued && (
          <span className="text-muted-foreground">
            Step {progress.stepIndex} / {progress.totalSteps}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!isQueued && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress.status === "failed" ? "bg-red-500" : "bg-blue-500",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Step list */}
      <ol className="space-y-1">
        {history.map((step) => (
          <li key={step.step} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "shrink-0 w-4 text-center font-mono",
                STATUS_COLORS[step.status],
              )}
            >
              {STATUS_ICONS[step.status]}
            </span>
            <span
              className={cn(
                step.status === "done"
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
            >
              {step.agentName}
            </span>
            {step.message && (
              <span className="text-muted-foreground truncate">
                — {step.message}
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Queued state */}
      {isQueued && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          {progress.message ??
            "Another task is running. This one will start automatically when the slot is free."}
        </p>
      )}
    </div>
  );
}
