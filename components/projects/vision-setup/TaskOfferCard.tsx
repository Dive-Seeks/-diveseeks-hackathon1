"use client";

import * as React from "react";
import { CheckIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TaskOfferCardProps {
  tasks: string[];
  onConfirm: (selected: string[]) => void;
  loading?: boolean;
}

export function TaskOfferCard({ tasks, onConfirm, loading = false }: TaskOfferCardProps) {
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Reset selection when tasks list changes (e.g. parent re-offers new tasks)
    setSelected([]);
    if (tasks.length === 0) {
      console.warn("[TaskOfferCard] Rendered with empty tasks array — nothing to offer.");
    }
  }, [tasks]);

  function toggle(task: string) {
    setSelected((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task],
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4 max-w-[85%]">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-amber-400 shrink-0" />
        <p className="text-[13px] font-semibold text-foreground">
          Based on your vision, here are suggested tasks for your team. Select the ones you want to start with.
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const isSelected = selected.includes(task);
          return (
            <button
              key={task}
              onClick={() => toggle(task)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-[14px] font-medium transition-all duration-150",
                isSelected
                  ? "border-amber-500/60 bg-amber-500/10 text-foreground"
                  : "border-border/40 bg-background hover:bg-muted/40 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "size-4 rounded-md border flex items-center justify-center shrink-0 transition-all",
                  isSelected ? "bg-amber-500 border-amber-500" : "border-border/60",
                )}
              >
                {isSelected && <CheckIcon className="size-3 text-white" />}
              </div>
              {task}
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => onConfirm(selected)}
        disabled={selected.length === 0 || loading}
        className="w-full rounded-xl h-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-[14px] hover:opacity-90 transition-opacity"
      >
        {loading ? (
          <><Loader2Icon className="size-4 animate-spin mr-2" /> Creating tasks...</>
        ) : (
          `Start with ${selected.length} task${selected.length !== 1 ? "s" : ""}`
        )}
      </Button>
    </div>
  );
}
