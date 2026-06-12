"use client";

import * as React from "react";
import { HolidayException } from "@/lib/setup-business-store";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

interface HolidayExceptionsSummaryProps {
  exceptions: HolidayException[];
}

export function HolidayExceptionsSummary({
  exceptions,
}: HolidayExceptionsSummaryProps) {
  if (exceptions.length === 0) return null;

  return (
    <div className="mt-6 text-left border rounded-xl p-4 bg-muted/30">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <CalendarIcon className="size-4 text-primary" />
        Holiday Exceptions Summary
      </h4>
      <ul className="space-y-2" role="list">
        {exceptions.map((ex) => (
          <li
            key={ex.id}
            className="text-xs flex flex-col gap-1 p-2 bg-background rounded-lg border"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">
                {ex.name || "Unnamed Holiday"}
              </span>
              <span className="text-muted-foreground font-medium">Closed</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1">
              <span>Range:</span>
              <span>
                {ex.startDate ? format(parseISO(ex.startDate), "PPP") : "N/A"}
                {" — "}
                {ex.endDate ? format(parseISO(ex.endDate), "PPP") : "N/A"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
