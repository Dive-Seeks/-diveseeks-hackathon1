"use client";

import * as React from "react";
import { WorkflowIcon } from "lucide-react";
import { WorkflowsProjectTable } from "@/components/projects/WorkflowsProjectTable";

export default function CodingWorkflowsPage() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a project to open its chat canvas and work with your Coding Team.
        </p>
      </div>

      <WorkflowsProjectTable team="coding" />
    </div>
  );
}
