"use client";

import * as React from "react";
import { Plus, CheckCircle2, MinusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCodingStore } from "@/lib/coding-store";
import { fetchProjectTasks } from "@/lib/abigail-api";
import type { TaskSession } from "@/lib/abigail-api";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusIcon(status: TaskSession["status"]) {
  if (status === "done" || status === "resolved_by_weight" || status === "resolved_by_rule") {
    return <CheckCircle2 className="size-4.5 text-emerald-500/80 shrink-0 mt-0.5" />;
  }
  if (status === "in_progress") {
    return <Loader2 className="size-4.5 text-blue-500 animate-spin shrink-0 mt-0.5" />;
  }
  return <MinusCircle className="size-4.5 text-muted-foreground shrink-0 mt-0.5" />;
}

export function TaskSidebar() {
  const { activeProjects } = useCodingStore();
  const projectId = activeProjects["coding"]?.id ?? null;
  const [tasks, setTasks] = React.useState<TaskSession[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchProjectTasks(projectId)
      .then((res) => setTasks(res.data.data.tasks))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const recent = tasks.slice(0, 6);
  const older = tasks.slice(6);

  return (
    <div className="w-full h-full flex flex-col bg-background/50 border-r border-border/40 overflow-hidden">
      <div className="p-4 space-y-6">
        <Button
          className="w-full justify-between bg-muted/40 hover:bg-muted/60 border-border/40 text-foreground rounded-xl h-11 px-4"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <span className="font-medium text-[15px]">New Task</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono opacity-50">Ctrl+Alt+N</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
        <div className="flex items-center gap-2 px-1 mb-4">
          <span className="text-sm font-medium text-muted-foreground">Tasks</span>
          <span className="px-2 py-0.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground">
            {loading ? "..." : tasks.length}
          </span>
        </div>

        {!projectId && (
          <p className="text-[13px] text-muted-foreground text-center py-8 px-2">
            No project selected. Visit Setup to create or select a project.
          </p>
        )}

        {projectId && loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {recent.map((task) => (
          <div
            key={task.id}
            className="group p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              {statusIcon(task.status)}
              <div className="space-y-1 overflow-hidden">
                <h4 className="text-[14px] font-medium text-foreground/90 truncate leading-tight">
                  {task.taskDescription}
                </h4>
                <p className="text-[12px] text-muted-foreground font-light">
                  {task.specialist && `${task.specialist} · `}{formatDate(task.createdAt)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {older.length > 0 && (
          <>
            <div className="pt-4 pb-2 px-1">
              <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Older</span>
            </div>
            {older.map((task) => (
              <div
                key={task.id}
                className="group p-4 rounded-2xl bg-muted/10 hover:bg-muted/20 border border-border/40 opacity-70 hover:opacity-100 transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  {statusIcon(task.status)}
                  <div className="space-y-1 overflow-hidden">
                    <h4 className="text-[14px] font-medium text-foreground/70 truncate leading-tight">
                      {task.taskDescription}
                    </h4>
                    <p className="text-[12px] text-muted-foreground/50 font-light">
                      {formatDate(task.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
