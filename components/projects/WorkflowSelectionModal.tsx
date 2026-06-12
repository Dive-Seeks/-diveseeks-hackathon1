"use client";

import * as React from "react";
import { Bot, LayoutDashboard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type WorkflowType = "autonomous" | "canvas";

interface WorkflowSelectionModalProps {
  projectId: string;
  onConfirm: (workflowType: WorkflowType) => Promise<void>;
}

export function WorkflowSelectionModal({
  projectId: _projectId,
  onConfirm,
}: WorkflowSelectionModalProps) {
  const [selected, setSelected] = React.useState<WorkflowType>("canvas");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(selected);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const options: { type: WorkflowType; icon: React.ElementType; title: string; description: string; recommended?: boolean }[] = [
    {
      type: "canvas",
      icon: LayoutDashboard,
      title: "Canvas workflow",
      description: "You manage tasks step by step on the visual canvas.",
      recommended: true,
    },
    {
      type: "autonomous",
      icon: Bot,
      title: "Autonomous workflow",
      description: "Abigail runs all tasks in the background without your input.",
    },
  ];

  return (
    <div className="flex flex-col h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-amber-400">
            Vision complete
          </p>
          <h2 className="text-[18px] font-semibold text-foreground">
            How should Abigail work?
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Choose how your project will run.
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => setSelected(opt.type)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all duration-150",
                  isSelected
                    ? "border-amber-400/60 bg-amber-400/5 ring-1 ring-amber-400/30"
                    : "border-border bg-card hover:border-border/80 hover:bg-muted/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 size-9 rounded-xl flex items-center justify-center shrink-0",
                      isSelected ? "bg-amber-400/15 text-amber-400" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-foreground">
                        {opt.title}
                      </span>
                      {opt.recommended && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "mt-1 size-4 rounded-full border-2 shrink-0 transition-colors",
                      isSelected ? "border-amber-400 bg-amber-400" : "border-border",
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-[12px] text-destructive text-center">{error}</p>
        )}

        <Button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-medium text-[14px]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Setting up…
            </span>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
