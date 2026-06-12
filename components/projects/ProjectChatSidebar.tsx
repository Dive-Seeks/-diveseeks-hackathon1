"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, CodeIcon, LayersIcon, DatabaseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCodingStore, ProjectTeam } from "@/lib/coding-store";
import { useAuthStore } from "@/lib/auth-store";
import { listProjects, Project } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

const TEAM_META: Record<ProjectTeam, { icon: React.ElementType; color: string; label: string }> = {
  coding:   { icon: CodeIcon,     color: "text-amber-500",   label: "Coding Team" },
  general:  { icon: LayersIcon,   color: "text-blue-500",    label: "General Team" },
  research: { icon: DatabaseIcon, color: "text-emerald-500", label: "Research Team" },
};

interface ProjectChatSidebarProps {
  team: ProjectTeam;
}

export function ProjectChatSidebar({ team }: ProjectChatSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeProjects, setActiveProject, clearActiveProject } = useCodingStore();
  const { isHydrated, isAuthenticated } = useAuthStore();
  const activeId = activeProjects[team]?.id ?? null;

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    setLoading(true);
    listProjects()
      .then((res) => {
        const all = res.data.data;
        const filtered = all.filter((p) => p.team === team);
        setProjects(filtered);
        // Clear stale active project if it no longer exists in the fetched list
        const currentActiveId = useCodingStore.getState().activeProjects[team]?.id;
        if (currentActiveId && !filtered.some((p) => p.id === currentActiveId)) {
          clearActiveProject(team);
        }
        const paramId = searchParams.get("projectId");
        if (paramId) {
          const match = filtered.find((p) => p.id === paramId);
          if (match) setActiveProject(team, match.id, match.name, match.description);
        }
      })
      .catch((err) => {
        const isNetworkError = !err?.response && (err?.code === "ECONNREFUSED" || err?.message?.includes("Network Error") || err?.message?.includes("ECONNREFUSED"));
        setProjects([]);
        if (isNetworkError && retryCount < 3) {
          setTimeout(() => setRetryCount((c) => c + 1), 3000);
        }
      })
      .finally(() => setLoading(false));
  }, [isHydrated, isAuthenticated, team, searchParams, setActiveProject, clearActiveProject, retryCount]);

  const { icon: TeamIcon, color, label } = TEAM_META[team];

  const handleSelect = (project: Project) => {
    setActiveProject(team, project.id, project.name, project.description);
  };

  return (
    <div className="w-full h-full flex flex-col bg-background/50 border-r border-border/40 overflow-hidden">
      <div className="p-4">
        <Button
          className="w-full justify-start bg-muted/40 hover:bg-muted/60 border-border/40 text-foreground rounded-xl h-11 px-4"
          variant="outline"
          onClick={() => router.push(`/${team}/projects/new`)}
        >
          <Plus className="size-4 mr-2" />
          <span className="font-medium text-[15px]">New Project</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
        <div className="flex items-center gap-2 px-1 mb-3">
          <span className="text-sm font-medium text-muted-foreground">Projects</span>
          <span className="px-2 py-0.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground">
            {loading ? "…" : projects.length}
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <p className="text-[13px] text-muted-foreground text-center py-8 px-2">
            No projects yet. Create your first {label} project.
          </p>
        )}

        {projects.map((project) => {
          const isActive = project.id === activeId;
          return (
            <button
              key={project.id}
              onClick={() => handleSelect(project)}
              className={cn(
                "group w-full text-left p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98]",
                isActive
                  ? "bg-muted/50 border-border/60 ring-1 ring-foreground/10"
                  : "bg-muted/20 hover:bg-muted/40 border-border/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("mt-0.5 shrink-0", color)}>
                  <TeamIcon className="size-4" />
                </div>
                <div className="space-y-0.5 overflow-hidden min-w-0 w-full">
                  <div className="flex items-center">
                    <h4 className="text-[14px] font-medium text-foreground/90 truncate leading-tight">
                      {project.name}
                    </h4>
                    {isActive && <ProjectStatusBadge projectId={project.id} />}
                  </div>
                  <p className="text-[12px] text-muted-foreground font-light truncate leading-normal">
                    {project.description ?? label}
                  </p>
                </div>
                {isActive && (
                  <div className="shrink-0 ml-auto mt-1.5">
                    <div className="size-1.5 rounded-full bg-foreground/40" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
