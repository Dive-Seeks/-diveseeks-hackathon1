"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  VisionTableSnapshot,
  VisionStep,
} from "@/types/vision-setup-envelope";

interface VisionTablePinnedProps {
  table: VisionTableSnapshot;
  onEditStep: (step: VisionStep) => void;
  className?: string;
}

const STATUS_LABEL: Record<"pending" | "in_progress" | "confirmed", string> = {
  pending: "⏸ Pending",
  in_progress: "⏳ In progress",
  confirmed: "✓ Confirmed",
};

export function VisionTablePinned({ table, onEditStep, className }: VisionTablePinnedProps) {
  const [open, setOpen] = React.useState(true);

  const rows: { step: VisionStep; label: string; value: string }[] = [
    {
      step: "description",
      label: "Description",
      value: table.description ?? "—",
    },
    {
      step: "tech_stack",
      label: "Tech Stack",
      value:
        [
          table.techStack.locked.length ? `locked: ${table.techStack.locked.join(", ")}` : null,
          table.techStack.forbidden.length ? `forbidden: ${table.techStack.forbidden.join(", ")}` : null,
          table.techStack.frontend.length ? `frontend: ${table.techStack.frontend.join(", ")}` : null,
          table.techStack.backend.length ? `backend: ${table.techStack.backend.join(", ")}` : null,
          table.techStack.infra.length ? `infra: ${table.techStack.infra.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || "—",
    },
    {
      step: "first_goal",
      label: "Goals",
      value:
        table.goals.map((g) => `${g.id}: ${g.title}`).join("; ") || "—",
    },
    {
      step: "constraints",
      label: "Constraints",
      value: table.constraints.join("; ") || "—",
    },
    {
      step: "open_questions",
      label: "Open Questions",
      value: table.openQuestions.join("; ") || "—",
    },
  ];

  return (
    <div className={cn("border-b border-border/40 bg-muted/10", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/20 transition-colors"
      >
        <span>Vision so far</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="px-6 pb-3">
          <div className="overflow-hidden rounded-lg border border-border/40 text-[13px]">
            <table className="w-full">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.step} className="border-b border-border/30 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-muted-foreground w-[140px] align-top">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-foreground align-top">{row.value}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap align-top">
                      <span className="text-[11px] text-muted-foreground mr-2">
                        {STATUS_LABEL[table.status[row.step]]}
                      </span>
                      {table.status[row.step] === "confirmed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px]"
                          onClick={() => onEditStep(row.step)}
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
