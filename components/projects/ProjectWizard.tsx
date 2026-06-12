"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GithubIcon,
  CodeIcon,
  DatabaseIcon,
  LayersIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  SparklesIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react";

import { useCodingStore, ProjectTeam } from "@/lib/coding-store";
import {
  createProject,
  connectGithubRepo,
  initProjectVision,
  checkProjectName,
  getGithubStatus,
  listGithubRepos,
  GithubRepo,
  GithubStatus,
} from "@/lib/projects-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "details" | "github" | "vision";

const ALL_STEPS: { id: Step; title: string; desc: string }[] = [
  { id: "details", title: "Project Details", desc: "Name & category" },
  { id: "github", title: "GitHub Connect", desc: "Link repositories" },
  { id: "vision", title: "System Vision", desc: "Goals & scope" },
];

// General and Research skip the Vision step — description is enough
const getSteps = (team: ProjectTeam) =>
  team === "coding" ? ALL_STEPS : ALL_STEPS.slice(0, 2);

const TEAM_CARDS: { id: ProjectTeam; name: string; desc: string; Icon: React.ElementType; activeBg: string }[] = [
  { id: "coding",   name: "Coding Team",   desc: "Requires code repository.",  Icon: CodeIcon,     activeBg: "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20" },
  { id: "general",  name: "General Team",  desc: "Optional repo connection.",   Icon: LayersIcon,   activeBg: "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20" },
  { id: "research", name: "Research Team", desc: "Optional repo connection.",   Icon: DatabaseIcon, activeBg: "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20" },
];

interface ProjectWizardProps {
  team: ProjectTeam;
}

export function ProjectWizard({ team }: ProjectWizardProps) {
  const router = useRouter();
  const { setActiveProject } = useCodingStore();

  const [currentStep, setCurrentStep] = React.useState<Step>("details");
  const [loading, setLoading] = React.useState(false);

  // Step 1 state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [nameAvailable, setNameAvailable] = React.useState<boolean | null>(null);
  const [checkingName, setCheckingName] = React.useState(false);

  // Step 2 state
  const [githubStatus, setGithubStatus] = React.useState<GithubStatus | null>(null);
  const [repos, setRepos] = React.useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  const [searchRepo, setSearchRepo] = React.useState("");
  const [loadingRepos, setLoadingRepos] = React.useState(false);

  // Step 3 state
  const [summary, setSummary] = React.useState("");
  const [constraintInput, setConstraintInput] = React.useState("");
  const [constraints, setConstraints] = React.useState<string[]>([]);
  const [goalInput, setGoalInput] = React.useState("");
  const [goals, setGoals] = React.useState<{ title: string; priority: number }[]>([]);

  // Name check debounce — null means "check failed / unknown", treated as blocking on Next
  React.useEffect(() => {
    if (!name.trim()) { setNameAvailable(null); return; }
    const handler = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await checkProjectName(name.trim());
        setNameAvailable(res.data.data.available);
      } catch {
        setNameAvailable(null);
        toast.error("Could not verify project name. Check your connection.");
      }
      finally { setCheckingName(false); }
    }, 400);
    return () => clearTimeout(handler);
  }, [name]);

  const fetchGithubInfo = React.useCallback(async () => {
    try {
      const res = await getGithubStatus();
      setGithubStatus(res.data.data);
      if (res.data.data.connected) {
        setLoadingRepos(true);
        const repoRes = await listGithubRepos();
        setRepos(repoRes.data.data);
      }
    } catch (err: unknown) { console.error("Failed to load GitHub status", err); }
    finally { setLoadingRepos(false); }
  }, []);

  React.useEffect(() => {
    if (currentStep === "github") {
      fetchGithubInfo();
    }
  }, [currentStep, fetchGithubInfo]);

  const handleAddConstraint = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && constraintInput.trim()) {
      e.preventDefault();
      if (!constraints.includes(constraintInput.trim())) setConstraints([...constraints, constraintInput.trim()]);
      setConstraintInput("");
    }
  };

  const handleAddGoal = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && goalInput.trim()) {
      e.preventDefault();
      if (!goals.some((g) => g.title === goalInput.trim())) setGoals([...goals, { title: goalInput.trim(), priority: 1 }]);
      setGoalInput("");
    }
  };

  const handleConnectGithub = async () => {
    try {
      window.open("/api/github/oauth/start", "_blank", "width=600,height=600");
      toast.info("Connection window opened. Click Refresh when done.");
    } catch { toast.error("Failed to initialize GitHub connection"); }
  };

  const STEPS = getSteps(team);

  const handleNext = () => {
    if (currentStep === "details") {
      if (!name.trim()) { toast.error("Project Name is required"); return; }
      if (nameAvailable === false) { toast.error("Project Name is already taken"); return; }
      if (nameAvailable === null && name.trim()) { toast.error("Waiting for name availability check"); return; }
      if (!description.trim()) { toast.error("Project description is required"); return; }
      setCurrentStep("github");
    } else if (currentStep === "github") {
      if (team === "coding" && !selectedRepo) {
        toast.error("A GitHub repository is required for the Coding team");
        return;
      }
      if (team !== "coding") {
        // General & Research: skip Vision, launch directly
        handleLaunch();
        return;
      }
      setCurrentStep("vision");
    }
  };

  const handleBack = () => {
    if (currentStep === "github") setCurrentStep("details");
    else if (currentStep === "vision") setCurrentStep("github");
  };

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const projRes = await createProject({ name: name.trim(), team, githubRepo: selectedRepo ?? undefined, techStack: [], description: description.trim() || undefined });
      const project = projRes.data.data;

      if (selectedRepo) {
        await connectGithubRepo({ projectId: project.id, repoFullName: selectedRepo });
      }

      await initProjectVision(project.id, {
        summary: description.trim() || summary.trim() || `Technical roadmap for project ${project.name}`,
        techStack: { locked: [], flexible: [], forbidden: [] },
        constraints,
        goals: goals.map((g) => ({ title: g.title, priority: g.priority })),
      });

      setActiveProject(team, project.id, project.name, project.description);
      toast.success(`Project "${project.name}" created! Let's set it up.`);
      router.push(`/${team}/projects/chat`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create project");
    } finally { setLoading(false); }
  };

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(searchRepo.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">

      {/* Stepper */}
      <div className="flex items-center justify-between border border-border/40 bg-muted/20 p-5 rounded-2xl backdrop-blur-sm shadow-sm">
        {STEPS.map((step, idx) => {
          const isDone = STEPS.findIndex((s) => s.id === currentStep) > idx;
          const isActive = step.id === currentStep;
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border",
                  isDone ? "bg-emerald-500 border-emerald-500 text-white"
                    : isActive ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10"
                    : "bg-background border-border/40 text-muted-foreground"
                )}>
                  {isDone ? <CheckIcon className="size-4" /> : idx + 1}
                </div>
                <div className="hidden md:block leading-none">
                  <p className="text-xs font-bold text-foreground">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-4 hidden md:block", isDone ? "bg-emerald-500" : "bg-border/40")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Form */}
      <div className="border border-border/40 bg-card/30 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm flex-1 flex flex-col justify-between min-h-[450px]">

        {/* Step 1: Details */}
        {currentStep === "details" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">Project details</h2>
              <p className="text-xs text-muted-foreground">Setup the basic identifiers of your workspace.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Name</Label>
              <div className="relative">
                <Input
                  id="proj-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Next Feature"
                  className="rounded-xl pr-10 focus-visible:ring-orange-500/50"
                  maxLength={100}
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  {checkingName ? <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                    : nameAvailable === true ? <CheckCircle2Icon className="size-4 text-emerald-500" />
                    : nameAvailable === false ? <AlertCircleIcon className="size-4 text-rose-500" />
                    : null}
                </div>
              </div>
              {nameAvailable === false && (
                <p className="text-xs text-rose-500 font-medium">This project name is already taken in your team.</p>
              )}
            </div>

            {/* Team selector — locked to prop */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                AI Agent Team (locked to {team})
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEAM_CARDS.map(({ id, name: cardName, desc, Icon, activeBg }) => {
                  const isActive = team === id;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "flex flex-col items-start text-left p-5 rounded-2xl border gap-3 select-none",
                        isActive ? activeBg : "bg-background border-border/40 opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div className="p-2 bg-background border rounded-xl shadow-sm">
                        <Icon className={cn("size-5", id === "coding" ? "text-amber-500" : id === "general" ? "text-blue-500" : "text-emerald-500")} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">{cardName}</p>
                        <p className="text-xs text-muted-foreground leading-normal">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="proj-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Description</Label>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this project does, who it's for, and what problem it solves..."
                className="rounded-xl focus-visible:ring-orange-500/50 resize-none"
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground">This becomes the foundation of your AI team's understanding of the project.</p>
            </div>
          </div>
        )}

        {/* Step 2: GitHub */}
        {currentStep === "github" && (
          <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">GitHub integration</h2>
              <p className="text-xs text-muted-foreground">
                {team === "coding" ? "Required: Connect your GitHub account and select a repository." : "Optional: Link a GitHub repository for this workspace."}
              </p>
            </div>

            {githubStatus ? (
              <div className="flex items-center justify-between p-4 bg-muted/40 border border-border/40 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-foreground text-background rounded-xl"><GithubIcon className="size-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{githubStatus.connected ? `Connected as ${githubStatus.githubLogin}` : "Not Connected"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{githubStatus.connected ? "Authorized via OAuth token" : "Requires GitHub authorization"}</p>
                  </div>
                </div>
                {!githubStatus.connected ? (
                  <Button onClick={handleConnectGithub} className="rounded-xl border border-border/80 bg-background text-foreground hover:bg-muted font-bold text-xs">Connect Account</Button>
                ) : (
                  <Button variant="outline" onClick={fetchGithubInfo} className="rounded-xl border-border/60 hover:bg-muted font-bold text-xs">Refresh Repos</Button>
                )}
              </div>
            ) : (
              <div className="h-20 rounded-2xl bg-muted/20 border border-border/40 animate-pulse flex items-center justify-center">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {githubStatus?.connected && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <Label htmlFor="search-repo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select GitHub Repository</Label>
                <Input
                  id="search-repo"
                  value={searchRepo}
                  onChange={(e) => setSearchRepo(e.target.value)}
                  placeholder="Filter repositories..."
                  className="rounded-xl focus-visible:ring-orange-500/50"
                />
                {loadingRepos ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-border/40 rounded-2xl bg-background/50 gap-2 min-h-[150px]">
                    <Loader2Icon className="size-5 animate-spin text-orange-500" />
                    <p className="text-xs text-muted-foreground font-medium">Loading repositories...</p>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-2xl text-center min-h-[150px]">
                    <p className="text-xs text-muted-foreground font-medium">No repositories found.</p>
                  </div>
                ) : (
                  <div className="flex-1 border border-border/40 rounded-2xl bg-background/50 divide-y divide-border/30 overflow-y-auto max-h-[220px] min-h-[150px]">
                    {filteredRepos.map((repo) => {
                      const isSelected = selectedRepo === repo.fullName;
                      return (
                        <button
                          key={repo.fullName}
                          onClick={() => setSelectedRepo(repo.fullName)}
                          className={cn("w-full flex items-center justify-between p-4 text-left transition-all duration-150", isSelected ? "bg-orange-500/5 border-l-2 border-l-orange-500" : "hover:bg-muted/30")}
                        >
                          <div className="space-y-1 min-w-0 pr-4">
                            <p className="text-sm font-bold text-foreground truncate">{repo.fullName}</p>
                            {repo.description && <p className="text-xs text-muted-foreground truncate leading-normal">{repo.description}</p>}
                          </div>
                          {isSelected && <div className="p-1 rounded-full bg-orange-500 text-white shrink-0"><CheckIcon className="size-3" /></div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Vision */}
        {currentStep === "vision" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold tracking-tight">System technical vision</h2>
              <p className="text-xs text-muted-foreground">Document core requirements and milestones for AI Specialist decomposition.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Roadmap / Architecture Summary</Label>
              <Textarea id="summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Briefly describe what this project will build..." className="rounded-xl focus-visible:ring-orange-500/50 resize-none" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Architectural Constraints</Label>
              <Input id="constraints" value={constraintInput} onChange={(e) => setConstraintInput(e.target.value)} onKeyDown={handleAddConstraint} placeholder="Type constraint and press Enter" className="rounded-xl focus-visible:ring-orange-500/50" />
              {constraints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {constraints.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium border border-border/40">
                      {c}
                      <button onClick={() => setConstraints(constraints.filter((item) => item !== c))} className="p-0.5 rounded-full hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"><XIcon className="size-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Milestones / Goals</Label>
              <Input id="goals" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onKeyDown={handleAddGoal} placeholder="Type goal and press Enter" className="rounded-xl focus-visible:ring-orange-500/50" />
              {goals.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {goals.map((g) => (
                    <div key={g.title} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                      <span className="font-semibold text-foreground">{g.title}</span>
                      <button onClick={() => setGoals(goals.filter((item) => item.title !== g.title))} className="p-1 rounded-full hover:bg-muted-foreground/20 text-muted-foreground transition-colors"><XIcon className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/40 pt-5 mt-6 gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={currentStep === "details" ? () => router.push(`/${team}/projects`) : handleBack}
            className="rounded-xl border border-border/40 hover:bg-muted/40 text-xs font-bold h-10 px-4"
          >
            <ArrowLeftIcon className="size-3.5 mr-1.5" />
            Back
          </Button>

          {(currentStep === "vision" || (currentStep === "github" && team !== "coding")) ? (
            <Button
              onClick={currentStep === "vision" ? handleLaunch : handleNext}
              disabled={loading || !name.trim()}
              className="rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold h-10 px-5 shadow-lg hover:shadow-xl flex items-center gap-1.5"
            >
              {loading ? <><Loader2Icon className="size-4 animate-spin" /> Building...</> : <><SparklesIcon className="size-4" /> Boot Workspace</>}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentStep === "details" ? !name.trim() || !description.trim() || checkingName || nameAvailable !== true : team === "coding" && !selectedRepo}
              className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold h-10 px-5 flex items-center gap-1.5"
            >
              Next Step
              <ArrowRightIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
