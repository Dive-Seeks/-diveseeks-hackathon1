"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FolderIcon,
  PlusIcon,
  GithubIcon,
  CodeIcon,
  DatabaseIcon,
  FileTextIcon,
  CheckCircle2Icon,
  SearchIcon,
  LayersIcon,
  LayoutGridIcon,
  TableIcon,
  CalendarIcon,
} from "lucide-react";
import { useCodingStore, ProjectTeam } from "@/lib/coding-store";
import { listProjects, Project } from "@/lib/projects-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

const TEAM_META: Record<ProjectTeam, {
  label: string;
  emptyLabel: string;
  icon: React.ElementType;
  bg: string;
  accentColor: string;
  name: string;
}> = {
  coding: {
    label: "Coding",
    emptyLabel: "No coding projects yet",
    icon: CodeIcon,
    bg: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    accentColor: "from-amber-500 to-orange-600",
    name: "Coding Team",
  },
  general: {
    label: "General",
    emptyLabel: "No general projects yet",
    icon: LayersIcon,
    bg: "bg-blue-500/10 border-blue-500/20 text-blue-500",
    accentColor: "from-blue-500 to-indigo-600",
    name: "General Team",
  },
  research: {
    label: "Research",
    emptyLabel: "No research projects yet",
    icon: DatabaseIcon,
    bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    accentColor: "from-emerald-500 to-teal-600",
    name: "Research Team",
  },
};

interface ProjectHubProps {
  team: ProjectTeam;
}

export function ProjectHub({ team }: ProjectHubProps) {
  const router = useRouter();
  const { activeProjects, setActiveProject, clearActiveProject } = useCodingStore();
  const activeProjectId = activeProjects[team]?.id ?? null;

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [view, setView] = React.useState<"grid" | "table">("table");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProjects()
      .then((res) => {
        if (!cancelled) setProjects((res.data.data as Project[]).filter((p) => p.team === team));
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to load projects");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [team]);

  const handleSelectProject = (project: Project) => {
    if (activeProjectId === project.id) {
      clearActiveProject(team);
      toast.info(`Deselected project "${project.name}"`);
    } else {
      setActiveProject(team, project.id, project.name, project.description);
      toast.success(`Active project set to "${project.name}"`);
    }
  };

  const filteredProjects = React.useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.githubRepo && p.githubRepo.toLowerCase().includes(q)) ||
        (p.techStack && p.techStack.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [projects, searchQuery]);

  const meta = TEAM_META[team];
  const TeamIcon = meta.icon;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-muted/30 p-8 md:p-10 shadow-sm backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-emerald-500/5 opacity-50 pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <TeamIcon className="size-5 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{meta.label} Workspace</span>
          </div>
          <h1 className={cn("text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r", meta.accentColor)}>
            Project Hub
          </h1>
          <p className="text-muted-foreground text-sm max-w-md">
            Manage your {meta.label.toLowerCase()} project lifecycles and coordinate AI Specialists.
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${team}/projects/new`)}
          className="relative z-10 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold h-11 px-5 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <PlusIcon className="size-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Search Bar + View Toggle */}
      <div className="flex items-center gap-3 bg-muted/10 p-3 rounded-2xl border border-border/40">
        <div className="relative flex-1 md:max-w-xs">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background border-border/40 focus-visible:ring-orange-500/50"
          />
        </div>
        <div className="flex items-center rounded-xl border border-border/40 bg-background overflow-hidden">
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              view === "table" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TableIcon className="size-3.5" />
            Table
          </button>
          <button
            onClick={() => setView("grid")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGridIcon className="size-3.5" />
            Grid
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-60 rounded-3xl border border-border/40 bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-border/60 bg-muted/10 text-center space-y-4">
          <div className="p-4 rounded-full bg-muted/40 border border-border/40 text-muted-foreground">
            <FolderIcon className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">{meta.emptyLabel}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create your first {meta.label.toLowerCase()} project to get started.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/${team}/projects/new`)}
            variant="outline"
            className="rounded-xl border-border/80 hover:bg-muted/40"
          >
            Create first project
          </Button>
        </div>
      ) : view === "table" ? (
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-8" />
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Repository</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Tech Stack</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project, idx) => {
                const isCurrentActive = activeProjectId === project.id;
                return (
                  <tr
                    key={project.id}
                    className={cn(
                      "border-b border-border/30 transition-colors",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                      isCurrentActive && "bg-orange-500/5 border-l-2 border-l-orange-500",
                      "hover:bg-muted/20"
                    )}
                  >
                    {/* Active indicator */}
                    <td className="px-4 py-3">
                      {isCurrentActive && (
                        <span className="flex h-2 w-2 mx-auto">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-orange-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg border flex items-center justify-center shrink-0", meta.bg)}>
                          <TeamIcon className="size-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center">
                            <p className="font-semibold text-foreground">{project.name}</p>
                            <ProjectStatusBadge projectId={project.id} />
                          </div>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Repository */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {project.githubRepo ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GithubIcon className="size-3.5 shrink-0" />
                          <span className="truncate max-w-[160px]">{project.githubRepo}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Tech Stack */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {project.techStack && project.techStack.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {project.techStack.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className="px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-medium border border-border/30"
                            >
                              {tech}
                            </span>
                          ))}
                          {project.techStack.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] text-muted-foreground border border-border/30">
                              +{project.techStack.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarIcon className="size-3.5 shrink-0" />
                        {new Date(project.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleSelectProject(project)}
                          variant={isCurrentActive ? "default" : "outline"}
                          className={cn(
                            "rounded-lg font-semibold text-xs h-8 px-3 transition-all duration-200",
                            isCurrentActive
                              ? "bg-orange-500 hover:bg-orange-600 text-white"
                              : "border-border/80 hover:bg-muted/40"
                          )}
                        >
                          {isCurrentActive ? (
                            <>
                              <CheckCircle2Icon className="size-3 mr-1" />
                              Active
                            </>
                          ) : (
                            "Select"
                          )}
                        </Button>
                        {team === "coding" && (
                          <Button
                            onClick={() => router.push(`/coding/projects/${project.id}/documents`)}
                            variant="ghost"
                            className="p-0 size-8 rounded-lg border border-border/40 hover:bg-muted/40 flex items-center justify-center"
                            title="Documents"
                          >
                            <FileTextIcon className="size-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const isCurrentActive = activeProjectId === project.id;
            return (
              <div
                key={project.id}
                className={cn(
                  "group relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 backdrop-blur-sm min-h-[220px]",
                  isCurrentActive
                    ? "bg-foreground/5 border-orange-500/50 shadow-md ring-1 ring-orange-500/20"
                    : "bg-card/40 border-border/40 hover:border-border/80 hover:shadow-md hover:translate-y-[-2px]"
                )}
              >
                {isCurrentActive && (
                  <span className="absolute top-4 right-4 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl border flex items-center justify-center shrink-0", meta.bg)}>
                      <TeamIcon className="size-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center">
                        <h3 className="font-extrabold text-foreground tracking-tight text-base truncate group-hover:text-orange-500 duration-200">
                          {project.name}
                        </h3>
                        <ProjectStatusBadge projectId={project.id} />
                      </div>
                      <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                        {meta.name}
                      </span>
                    </div>
                  </div>

                  {project.githubRepo ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/40">
                      <GithubIcon className="size-3.5 text-foreground/75" />
                      <span className="truncate">{project.githubRepo}</span>
                    </div>
                  ) : (
                    team === "coding" && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                        <GithubIcon className="size-3.5 text-amber-500" />
                        <span>No repository linked</span>
                      </div>
                    )
                  )}

                  {project.techStack && project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded-md bg-muted/60 text-[10px] font-medium border border-border/30"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <Button
                    onClick={() => handleSelectProject(project)}
                    variant={isCurrentActive ? "default" : "outline"}
                    className={cn(
                      "flex-1 rounded-xl font-bold text-xs h-9 transition-all duration-200",
                      isCurrentActive
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "border-border/80 hover:bg-muted/40"
                    )}
                  >
                    {isCurrentActive ? (
                      <>
                        <CheckCircle2Icon className="size-3.5 mr-1.5" />
                        Selected
                      </>
                    ) : (
                      "Select Workspace"
                    )}
                  </Button>

                  {team === "coding" && (
                    <Button
                      onClick={() => router.push(`/coding/projects/${project.id}/documents`)}
                      variant="ghost"
                      className="p-0 size-9 rounded-xl border border-border/40 hover:bg-muted/40 hover:border-border/80 flex items-center justify-center"
                      title="Document Manager"
                    >
                      <FileTextIcon className="size-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
