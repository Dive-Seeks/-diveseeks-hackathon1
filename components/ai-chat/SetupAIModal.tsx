"use client";

import * as React from "react";
import { Loader2, CheckCircle2, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchCoordinatorScope, updateAgent, bootTenant, checkCoordinatorName } from "@/lib/abigail-api";
import type { Agent } from "@/lib/abigail-api";

// ── Static team rosters ───────────────────────────────────────────────────────

const TEAM_GROUPS = [
  {
    label: "Coding Team",
    color: "text-orange-400",
    members: [
      { name: "Rex",   role: "Backend Engineer",   responsibility: "APIs, databases, server logic, and security.",              unsplash: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face" },
      { name: "Nova",  role: "Frontend Engineer",  responsibility: "UI components, accessibility, and performance.",            unsplash: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face" },
      { name: "Kai",   role: "Code Reviewer",      responsibility: "Architecture enforcement, PR reviews, and code quality.",   unsplash: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face" },
      { name: "Sage",  role: "Test Engineer",      responsibility: "Unit, integration, and E2E test coverage.",                 unsplash: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face" },
      { name: "Atlas", role: "DevOps Engineer",    responsibility: "CI/CD pipelines, Docker, and deployment reliability.",      unsplash: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face" },
      { name: "Felix", role: "Security Auditor",   responsibility: "OWASP checks, secret detection, and auth flows.",           unsplash: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=face" },
      { name: "Pixel", role: "Debugger",           responsibility: "Root cause analysis and crash investigation.",              unsplash: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face" },
      { name: "Luma",  role: "Documentation",      responsibility: "READMEs, API docs, and inline comments.",                   unsplash: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=face" },
      { name: "Orion", role: "Architect",          responsibility: "High-level design, ADRs, and system architecture.",         unsplash: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=120&h=120&fit=crop&crop=face" },
      { name: "Vex",   role: "Security Tester",    responsibility: "XSS, CSRF, SQL injection, and penetration testing.",        unsplash: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face" },
    ],
  },
  {
    label: "General Team",
    color: "text-blue-400",
    members: [
      { name: "Echo",  role: "Summarizer",         responsibility: "Condenses long content without losing meaning.",            unsplash: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=face" },
      { name: "Lyra",  role: "Writer",             responsibility: "Drafts posts, essays, captions, and articles.",             unsplash: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face" },
      { name: "Spark", role: "Brainstormer",       responsibility: "Generates ideas in numbered lists, diverge-first.",         unsplash: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face" },
      { name: "Zoe",   role: "Communicator",       responsibility: "Rewrites emails, messages, and replies.",                   unsplash: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face" },
      { name: "Gist",  role: "Explainer",          responsibility: "Simplifies complex topics using analogies.",                unsplash: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face" },
      { name: "Memo",  role: "Organizer",          responsibility: "Turns raw input into structured bullets and headers.",      unsplash: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=120&h=120&fit=crop&crop=face" },
      { name: "Tran",  role: "Translator",         responsibility: "Multilingual translation with tone preservation.",          unsplash: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=120&h=120&fit=crop&crop=face" },
      { name: "Plan",  role: "Planner",            responsibility: "Breaks goals into time-bounded actionable steps.",          unsplash: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face" },
      { name: "Vibe",  role: "Tone & Style",       responsibility: "Rewrites content to match formal or casual tone.",          unsplash: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=face" },
      { name: "Quest", role: "Q&A",                responsibility: "General knowledge fallback. Never fabricates facts.",       unsplash: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face" },
    ],
  },
  {
    label: "Research Team",
    color: "text-emerald-400",
    members: [
      { name: "Lit",    role: "Literature Reviewer", responsibility: "Maps academic works by theme, flags seminal papers.",     unsplash: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=120&h=120&fit=crop&crop=face" },
      { name: "Cite",   role: "Citation Manager",    responsibility: "Formats references in APA, MLA, Chicago, Vancouver.",     unsplash: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=face" },
      { name: "Hypo",   role: "Hypothesis Builder",  responsibility: "Designs research questions and methodologies.",           unsplash: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop&crop=face" },
      { name: "Peer",   role: "Peer Reviewer",       responsibility: "Critiques drafts, flags weak arguments rigorously.",      unsplash: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=face" },
      { name: "Scribe", role: "Academic Writer",     responsibility: "Writes papers, theses, and abstracts with structure.",    unsplash: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop&crop=face" },
      { name: "Tutor",  role: "Student Support",     responsibility: "Explains concepts calibrated to the student's level.",    unsplash: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face" },
      { name: "Prof",   role: "Curriculum Designer", responsibility: "Builds lesson plans aligned to Bloom's Taxonomy.",        unsplash: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=face" },
      { name: "Grant",  role: "Grant Writer",        responsibility: "Writes funding proposals tailored to funder priorities.",  unsplash: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=face" },
      { name: "Data",   role: "Research Analyst",    responsibility: "Interprets datasets and statistics with honest limits.",   unsplash: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face" },
      { name: "Synth",  role: "Knowledge Synthesizer", responsibility: "Connects ideas across sources, flags contradictions.", unsplash: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face" },
    ],
  },
];


interface SetupAIModalProps {
  open: boolean;
  onComplete: () => void;
}

type Phase = "loading" | "booting" | "form" | "saving" | "error";
type Step = 1 | 2;
type TeamTab = "coding" | "general" | "research";
type NameStatus = "idle" | "checking" | "available" | "taken";

const DEV = process.env.NODE_ENV === "development";

export function SetupAIModal({ open, onComplete }: SetupAIModalProps) {
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [step, setStep] = React.useState<Step>(1);
  const [coordinator, setCoordinator] = React.useState<Agent | null>(null);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TeamTab>("coding");
  const [nameStatus, setNameStatus] = React.useState<NameStatus>("idle");
  // Tracks the name that was loaded from the DB so the debounce effect can
  // skip the availability check when the user hasn't changed it yet.
  const loadedNameRef = React.useRef<string>("");

  // Stable ref so onComplete never triggers effect re-runs
  const onCompleteRef = React.useRef(onComplete);
  React.useLayoutEffect(() => { onCompleteRef.current = onComplete; });

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPhase("loading");
    setStep(1);
    setNameStatus("idle");
    loadedNameRef.current = "";
    fetchCoordinatorScope()
      .then((res) => {
        if (cancelled) return;
        const coord = res.data.data.find((a) => a.role === "coordinator") ?? null;
        if (coord) {
          const initialName = coord.name === "Abigail" ? "" : coord.name;
          loadedNameRef.current = initialName.toLowerCase();
          setCoordinator(coord);
          setName(initialName);
          setPhase("form");
          return;
        }
        // No coordinator yet — boot the tenant
        setPhase("booting");
        return bootTenant()
          .then((bootRes) => {
            if (cancelled) return;
            const booted = bootRes.data.data.coordinator;
            loadedNameRef.current = "";
            setCoordinator(booted);
            setName("");
            setPhase("form");
          })
          .catch(() => { if (!cancelled) setPhase("error"); });
      })
      .catch(() => { if (!cancelled) setPhase("error"); });
    return () => { cancelled = true; };
  }, [open]);

  // Debounced name-availability check — fires 400ms after the user stops typing.
  // Skips the network call when the name hasn't changed from what was loaded out
  // of the DB (avoids a race where coordinator state hasn't committed yet and
  // excludeId would be undefined, causing the user's own name to show as taken).
  React.useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameStatus("idle");
      return;
    }
    // Name unchanged from what was loaded — no need to check
    if (trimmed.toLowerCase() === loadedNameRef.current) {
      setNameStatus("available");
      return;
    }
    setNameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await checkCoordinatorName(trimmed, coordinator?.id);
        setNameStatus(res.data.data.available ? "available" : "taken");
      } catch {
        setNameStatus("idle");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [name, coordinator?.id]);

  async function handleConfirmName() {
    if (!coordinator) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your AI a name to continue.");
      return;
    }
    if (nameStatus === "taken") {
      setError("That name is already taken. Try another one.");
      return;
    }
    setError("");
    setPhase("saving");
    try {
      await updateAgent(coordinator.id, { name: trimmed });
      setCoordinator((prev) => prev ? { ...prev, name: trimmed } : prev);
      setPhase("form");
      toast.success(`${trimmed} is ready`, {
        description: "Your AI model is set up and ready to work.",
      });
      setStep(2);
    } catch {
      setError("Failed to save. Please try again.");
      setPhase("form");
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="!w-[95vw] sm:!w-[85vw] md:!w-[80vw] !max-w-[80vw] !h-[90vh] sm:!h-[80vh] md:!h-[70vh] !max-h-[90vh] sm:!max-h-[80vh] md:!max-h-[70vh] p-0 overflow-hidden gap-0 flex flex-col"
      >
        <DialogTitle className="sr-only">Setup your AI coordinator</DialogTitle>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 pb-0">
          {([1, 2] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                step >= s ? "bg-foreground/70" : "bg-foreground/10",
              )}
            />
          ))}
        </div>

        {/* DEV-only jump controls */}
        {DEV && (
          <div className="flex items-center gap-2 px-6 pt-2">
            <span className="text-[10px] font-mono text-orange-400/70 uppercase tracking-widest">dev</span>
            {([1, 2] as Step[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setCoordinator((c) => c ?? { id: "dev", name: "Aria", role: "coordinator", status: "active" });
                  setName((n) => n || "Aria");
                  setPhase("form");
                  setNameStatus("idle");
                  setStep(s);
                }}
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors",
                  step === s
                    ? "border-orange-400/60 text-orange-400 bg-orange-400/10"
                    : "border-orange-400/20 text-orange-400/40 hover:border-orange-400/50 hover:text-orange-400/70",
                )}
              >
                step {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 1: Name your AI ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="px-4 sm:px-6 py-6 space-y-7">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                Step 1 of 2
              </p>
              <h2 className="text-[22px] font-semibold tracking-tight">
                Name your AI
              </h2>
              <p className="text-[13px] text-muted-foreground">
                This is your personal AI Model with own parameters.
              </p>
            </div>

            {(phase === "loading" || phase === "booting") && (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
                <p className="text-[12px] text-muted-foreground/50">
                  {phase === "booting" ? "Setting up your team…" : "Loading…"}
                </p>
              </div>
            )}

            {phase === "error" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">
                  Could not connect to the server. Make sure the backend is running.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPhase("loading");
                    fetchCoordinatorScope()
                      .then((res) => {
                        const coord = res.data.data.find((a) => a.role === "coordinator") ?? null;
                        if (coord) {
                          setCoordinator(coord);
                          setName(coord.name === "Abigail" ? "" : coord.name);
                          setPhase("form");
                        } else {
                          setPhase("booting");
                          bootTenant()
                            .then((bootRes) => {
                              setCoordinator(bootRes.data.data.coordinator);
                              setName("");
                              setPhase("form");
                            })
                            .catch(() => setPhase("error"));
                        }
                      })
                      .catch(() => setPhase("error"));
                  }}
                  className="text-[12px]"
                >
                  Retry
                </Button>
              </div>
            )}

            {(phase === "form" || phase === "saving") && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleConfirmName()}
                      placeholder="e.g. Aria, Nova, Zara…"
                      autoFocus
                      maxLength={32}
                      className={cn(
                        "w-full bg-transparent text-[20px] font-medium outline-none pr-8",
                        "border-b pb-2 transition-colors",
                        error || nameStatus === "taken"
                          ? "border-red-500/60 placeholder:text-red-400/30"
                          : nameStatus === "available"
                          ? "border-emerald-500/60 placeholder:text-muted-foreground/20"
                          : "border-border/50 focus:border-foreground/40 placeholder:text-muted-foreground/20",
                      )}
                    />
                    {/* Availability indicator */}
                    {name.trim() && (
                      <span className="absolute right-0 bottom-3 pointer-events-none">
                        {nameStatus === "checking" && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground/50" />
                        )}
                        {nameStatus === "available" && (
                          <Check className="size-4 text-emerald-500" />
                        )}
                        {nameStatus === "taken" && (
                          <X className="size-4 text-red-500" />
                        )}
                      </span>
                    )}
                  </div>
                  {/* Status message below input */}
                  {(error || nameStatus === "taken" || nameStatus === "available") && (
                    <p className={cn(
                      "text-[12px]",
                      error || nameStatus === "taken" ? "text-red-500" : "text-emerald-500",
                    )}>
                      {error
                        ? error
                        : nameStatus === "taken"
                        ? "That name is already taken. Try another one."
                        : "Name is available!"}
                    </p>
                  )}
                </div>

              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <button
                type="button"
                onClick={onComplete}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
              <Button
                onClick={handleConfirmName}
                disabled={!name.trim() || phase === "saving" || nameStatus === "taken" || nameStatus === "checking"}
                className="h-9 px-5 rounded-xl text-[13px] font-medium gap-1.5"
              >
                {phase === "saving" ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Saving…</>
                ) : (
                  <>Save &amp; Next <ArrowRight className="size-3.5" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Meet the team ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header + toggle */}
            <div className="px-4 sm:px-8 pt-4 pb-2 shrink-0 space-y-2">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                  Step 2 of 2
                </p>
                <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight">
                  Meet your team
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  <span className="text-foreground font-medium">{coordinator?.name}</span> coordinates 30 specialists across three teams.
                </p>
              </div>

              {/* 3-way team toggle — full width on mobile, centered pill on desktop */}
              <div className="flex items-center rounded-xl bg-muted/40 p-1 gap-1 w-full sm:w-fit sm:mx-auto">
                {(["coding", "general", "research"] as TeamTab[]).map((tab) => {
                  const group = TEAM_GROUPS.find((g) =>
                    g.label.toLowerCase().startsWith(tab)
                  )!;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all capitalize",
                        activeTab === tab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className={cn(activeTab === tab ? group.color : "")}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team grid — scrollable, 2 cols mobile → 3 cols sm → 5 cols md+ */}
            <div className="px-4 sm:px-8 pb-4 flex-1 overflow-y-auto min-h-0">
              {TEAM_GROUPS.filter((g) => g.label.toLowerCase().startsWith(activeTab)).map((group) => (
                <div key={group.label} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {group.members.map((member) => (
                    <div
                      key={member.name}
                      className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-4 flex flex-col items-center text-center gap-2"
                    >
                      <div className="size-14 rounded-full overflow-hidden ring-2 ring-border/30 shrink-0">
                        <img
                          src={member.unsplash}
                          alt={member.name}
                          className="size-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-semibold leading-tight">{member.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{member.role}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                        {member.responsibility}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="px-4 sm:px-8 py-3 border-t border-border/30 shrink-0">
              <Button
                onClick={onComplete}
                className="w-full h-9 rounded-xl text-[13px] font-medium gap-1.5"
              >
                <CheckCircle2 className="size-3.5" />
                Accept team &amp; go to workspace
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
