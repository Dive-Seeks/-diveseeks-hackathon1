"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CodeIcon,
  LayersIcon,
  DatabaseIcon,
  GithubIcon,
  CalendarIcon,
  ArrowRightIcon,
  FolderPlusIcon,
  Loader2,
  ScanEye,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { listProjects, listWorkflowReadyProjects, Project } from "@/lib/projects-api";
import { useCodingStore, ProjectTeam } from "@/lib/coding-store";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TEAM_META: Record<ProjectTeam, { icon: React.ElementType; color: string; bg: string }> = {
  coding:   { icon: CodeIcon,     color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20" },
  general:  { icon: LayersIcon,   color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  research: { icon: DatabaseIcon, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

interface WorkflowsProjectTableProps {
  team: ProjectTeam;
}

export function WorkflowsProjectTable({ team }: WorkflowsProjectTableProps) {
  const router = useRouter();
  const { isHydrated, isAuthenticated } = useAuthStore();
  const { activeProjects, setActiveProject } = useCodingStore();
  const activeId = activeProjects[team]?.id ?? null;

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [allCount, setAllCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listWorkflowReadyProjects(),
      listProjects(),
    ])
      .then(([readyRes, allRes]) => {
        if (!cancelled) {
          setProjects((readyRes.data.data as Project[]).filter((p) => p.team === team));
          setAllCount((allRes.data.data as Project[]).filter((p) => p.team === team).length);
        }
      })
      .catch(() => { if (!cancelled) { setProjects([]); setAllCount(0); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isHydrated, isAuthenticated, team]);

  const { icon: TeamIcon, color, bg } = TEAM_META[team];

  const handleClick = (project: Project) => {
    if (!project.taskCount) return; // block until CEO assigns tasks
    setActiveProject(team, project.id, project.name, project.description);
    router.push(`/${team}/workflows/${project.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) {
    // Projects exist but vision not complete on any of them
    if (allCount > 0) {
      return (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-4">
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <ScanEye className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">Vision setup required</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              You have {allCount} project{allCount !== 1 ? 's' : ''} but none have completed vision setup.
              Finish setting up a project before it appears here.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/${team}/projects/chat`)}
            variant="outline"
            className="rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
          >
            Go set up vision
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center space-y-4">
        <div className="p-4 rounded-full bg-muted/40 border border-border/40 text-muted-foreground">
          <FolderPlusIcon className="size-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">No projects yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create a project to start using workflows.
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${team}/projects/chat`)}
          variant="outline"
          className="rounded-xl border-border/80 hover:bg-muted/40"
        >
          Create first project
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Repository</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Created</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {projects.map((project, idx) => {
            const isActive = activeId === project.id;
            const accessGranted = (project.taskCount ?? 0) > 0;
            return (
              <tr
                key={project.id}
                onClick={() => handleClick(project)}
                className={cn(
                  "border-b border-border/30 transition-colors",
                  accessGranted ? "cursor-pointer hover:bg-muted/25" : "cursor-not-allowed opacity-70",
                  idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                  isActive && accessGranted && "border-l-2 border-l-blue-500 bg-blue-500/5",
                )}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg border flex items-center justify-center shrink-0", bg, color)}>
                      <TeamIcon className="size-3.5" />
                    </div>
                    <div>
                      <p className={cn("font-semibold", isActive ? "text-blue-500" : "text-foreground")}>
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.description}</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="ml-2 flex h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                </td>

                {/* Repo */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {project.githubRepo ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <GithubIcon className="size-3.5 shrink-0" />
                      <span className="truncate max-w-[160px]">{project.githubRepo}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  {accessGranted ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      Access Granted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock className="size-3.5 shrink-0 animate-pulse" />
                      Waiting
                    </span>
                  )}
                </td>

                {/* Created */}
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3.5 shrink-0" />
                    {new Date(project.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </td>

                {/* Arrow — only shown when accessible */}
                <td className="px-3 py-3">
                  {accessGranted && (
                    <ArrowRightIcon className="size-4 text-muted-foreground/50 transition-colors" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
