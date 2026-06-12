"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Github, Loader2, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { SetupAIModal } from "@/components/ai-chat/SetupAIModal";
import { useAuthStore } from "@/lib/auth-store";
import { useCodingStore } from "@/lib/coding-store";
import { createProject, initProjectVision } from "@/lib/abigail-api";

// ── Interview script ──────────────────────────────────────────────────────────
// Abigail asks these questions in order. Each answer is stored keyed by `key`.
const INTERVIEW: { key: string; question: string }[] = [
  {
    key: "what",
    question: "What is this project? Give me one sentence — what does it do and who is it for?",
  },
  {
    key: "stack",
    question: "What's your core tech stack? List the languages, frameworks, and databases you're committed to.",
  },
  {
    key: "forbidden",
    question: "Is there anything I should never use or suggest for this project? Libraries, patterns, approaches — anything off-limits?",
  },
  {
    key: "constraints",
    question: "Are there any hard rules I must always follow? For example: always filter by tenant_id, no SELECT *, API responses under 200ms — that kind of thing.",
  },
  {
    key: "goals",
    question: "What are the top 1–3 goals you want Abigail to help you achieve in the next few weeks?",
  },
];

interface ChatMessage {
  role: "abigail" | "user";
  content: string;
}

// ── Main component ────────────────────────────────────────────────────────────

type Phase = "preflight" | "interview" | "saving" | "done";

export default function ProjectSetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { setActiveProject } = useCodingStore();

  // Show AI modal before the project wizard
  const [aiModalOpen, setAiModalOpen] = React.useState(true);
  const [phase, setPhase] = React.useState<Phase>("preflight");

  // Pre-flight
  const [projectName, setProjectName] = React.useState("");
  const [githubRepo, setGithubRepo] = React.useState("");
  const [preflightError, setPreflightError] = React.useState("");

  // Interview
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [saveError, setSaveError] = React.useState("");

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Phase: preflight ────────────────────────────────────────────────────────

  function handlePreflightContinue() {
    if (!projectName.trim()) {
      setPreflightError("Project name is required.");
      return;
    }
    setPreflightError("");
    // Kick off interview
    const opener: ChatMessage = {
      role: "abigail",
      content: `Great — "${projectName.trim()}". Let's define the vision so I can govern this project correctly.\n\n${INTERVIEW[0].question}`,
    };
    setMessages([opener]);
    setQuestionIndex(0);
    setPhase("interview");
  }

  // ── Phase: interview ────────────────────────────────────────────────────────

  function handleSend(userText: string) {
    const currentKey = INTERVIEW[questionIndex].key;
    const updatedAnswers = { ...answers, [currentKey]: userText.trim() };
    setAnswers(updatedAnswers);

    const userMsg: ChatMessage = { role: "user", content: userText.trim() };

    const nextIndex = questionIndex + 1;

    if (nextIndex < INTERVIEW.length) {
      // Ask next question
      const abigailMsg: ChatMessage = {
        role: "abigail",
        content: INTERVIEW[nextIndex].question,
      };
      setMessages((prev) => [...prev, userMsg, abigailMsg]);
      setQuestionIndex(nextIndex);
    } else {
      // Interview complete — synthesize
      const closingMsg: ChatMessage = {
        role: "abigail",
        content: synthesizeVisionSummary(projectName.trim(), updatedAnswers),
      };
      setMessages((prev) => [...prev, userMsg, closingMsg]);
      setQuestionIndex(nextIndex);
      // Save after a short delay so user sees the synthesis message
      setTimeout(() => saveProject(updatedAnswers), 800);
    }
  }

  function synthesizeVisionSummary(name: string, a: Record<string, string>): string {
    const lines: string[] = [
      `Perfect. Here's the vision I've written for ${name}:`,
      "",
      a.what ? `**What:** ${a.what}` : null,
      a.stack ? `**Stack:** ${a.stack}` : null,
      a.forbidden ? `**Never use:** ${a.forbidden}` : null,
      a.constraints ? `**Hard rules:** ${a.constraints}` : null,
      a.goals ? `**Goals:** ${a.goals}` : null,
      "",
      "Saving your project now…",
    ].filter((l): l is string => l !== null);
    return lines.join("\n");
  }

  async function saveProject(finalAnswers: Record<string, string>) {
    setPhase("saving");
    setSaveError("");
    try {
      const teamId = user?.tenantId ?? "";
      const stackLines = (finalAnswers.stack ?? "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const projRes = await createProject({
        name: projectName.trim(),
        teamId,
        githubRepo: githubRepo.trim() || undefined,
        techStack: stackLines,
      });
      const project = projRes.data.data;

      const forbiddenList = (finalAnswers.forbidden ?? "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const constraintsList = (finalAnswers.constraints ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const visionBody = {
        summary: finalAnswers.what ?? "",
        techStack: {
          locked: stackLines,
          forbidden: forbiddenList,
          flexible: [],
        },
        constraints: constraintsList,
        goals: (finalAnswers.goals ?? "")
          .split(/[\n,]+/)
          .map((s, i) => ({ title: s.trim(), priority: i + 1 }))
          .filter((g) => g.title),
      };

      await initProjectVision(project.id, visionBody);

      setActiveProject("coding", project.id, projectName.trim());
      setPhase("done");
      setTimeout(() => router.push("/coding"), 1400);
    } catch {
      setSaveError("Failed to save project. Please try again.");
      setPhase("interview");
    }
  }

  const interviewDone = questionIndex >= INTERVIEW.length;

  // ── Render: AI modal (shown before wizard) ──────────────────────────────────

  if (aiModalOpen) {
    return (
      <SetupAIModal
        open={aiModalOpen}
        onComplete={() => setAiModalOpen(false)}
      />
    );
  }

  // ── Render: pre-flight phase ────────────────────────────────────────────────

  if (phase === "preflight") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-10 animate-in fade-in zoom-in-95 duration-500">

          <div className="text-center space-y-2">
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
              Abigail AI · Project Setup
            </p>
            <h1 className="text-3xl font-medium tracking-tight">
              Let's start with the basics
            </h1>
            <p className="text-muted-foreground text-[15px]">
              Two quick questions, then Abigail will interview you to write your project's vision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1 — Project name */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-3 hover:border-border transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-muted/60 flex items-center justify-center">
                  <FolderGit2 className="size-4 text-muted-foreground" />
                </div>
                <span className="text-[13px] font-semibold text-foreground/80">Project name</span>
              </div>
              <input
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setPreflightError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePreflightContinue()}
                placeholder="e.g. Dive POS Backend"
                autoFocus
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-1 focus:border-foreground/30 transition-colors"
              />
            </div>

            {/* Card 2 — GitHub */}
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 space-y-3 hover:border-border transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-muted/60 flex items-center justify-center">
                  <Github className="size-4 text-muted-foreground" />
                </div>
                <span className="text-[13px] font-semibold text-foreground/80">
                  GitHub repo
                  <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">(optional)</span>
                </span>
              </div>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePreflightContinue()}
                placeholder="org/repo-name"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/40 border-b border-border/40 pb-1 focus:border-foreground/30 transition-colors"
              />
            </div>
          </div>

          {preflightError && (
            <p className="text-center text-[13px] text-red-500">{preflightError}</p>
          )}

          <Button
            onClick={handlePreflightContinue}
            disabled={!projectName.trim()}
            className="w-full h-12 rounded-2xl text-[15px] font-medium"
          >
            Continue to interview
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: done phase ──────────────────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 animate-in fade-in duration-500">
        <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold">Project initialized</p>
          <p className="text-[13px] text-muted-foreground">Abigail's vision is set. Redirecting…</p>
        </div>
      </div>
    );
  }

  // ── Render: interview phase (ChatCanvas) ────────────────────────────────────

  const progress = Math.round((questionIndex / INTERVIEW.length) * 100);

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="h-0.5 bg-border/30 shrink-0">
        <div
          className="h-full bg-foreground/30 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ChatCanvas
          greeting="Abigail's Vision Interview"
          subtitle="Answer honestly — Abigail will write a precise vision from your words."
          placeholder="Type your answer…"
          initialHasMessages
          onSend={interviewDone || phase === "saving" ? () => {} : handleSend}
        >
          <div className="max-w-3xl mx-auto w-full space-y-4 py-6 pb-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {m.role === "abigail" && (
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="size-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="size-3 text-foreground/60" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted/40 border border-border/40 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                )}
                {m.role === "user" && (
                  <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 bg-foreground text-background max-w-[75%] text-[15px] leading-relaxed">
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {phase === "saving" && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                    <Sparkles className="size-3 text-foreground/60" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted/40 border border-border/40 text-[15px] text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Saving project…
                  </div>
                </div>
              </div>
            )}

            {saveError && (
              <p className="text-center text-[13px] text-red-500 py-2">{saveError}</p>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ChatCanvas>
      </div>
    </div>
  );
}
