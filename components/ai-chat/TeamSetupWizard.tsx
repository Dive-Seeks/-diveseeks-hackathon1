"use client";

import * as React from "react";
import {
  Sparkles, Plus, Pencil, Check, X, ChevronLeft,
  Brain, Loader2, Send, UserRound, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SetupAIModal } from "@/components/ai-chat/SetupAIModal";
import { useRouter } from "next/navigation";
import { fetchCoordinatorScope, updateAgent, fetchOrgChart } from "@/lib/abigail-api";
import type { Agent } from "@/lib/abigail-api";
import { useAuthStore } from "@/lib/auth-store";
import { markSetupComplete } from "@/hooks/useCoordinator";
import api from "@/lib/api";

// ── Role display helpers ─────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  coordinator: "AI Coordinator",
  specialist:  "Specialist",
  manager:     "Manager",
  "night-team": "Night Agent",
};

const ROLE_COLORS: Record<string, string> = {
  coordinator: "from-violet-500/20 to-purple-500/10 border-violet-500/20",
  specialist:  "from-blue-500/20 to-cyan-500/10 border-blue-500/20",
  manager:     "from-amber-500/20 to-yellow-500/10 border-amber-500/20",
  "night-team":"from-slate-500/20 to-zinc-500/10 border-slate-500/20",
};

// Core / sleeping agents that must NOT be shown on the team cards
const HIDDEN_ROLES = new Set(["global-ceo", "industry-ceo", "ceo"]);

// ── Interview messages ───────────────────────────────────────────────────────

interface Message {
  role: "abigail" | "user";
  content: string;
}

// Abigail's opening question for new agent interview
const OPENING_MESSAGE: Message = {
  role: "abigail",
  content: `I'll help you define this new team member properly.\n\nLet's start simple: What does this agent need to do? Describe their main job in one or two sentences — think about what problem they solve for your project.`,
};

// ── Wizard step types ────────────────────────────────────────────────────────

type WizardStep = "ai-modal" | "team" | "interview";

// ── Main component ───────────────────────────────────────────────────────────

interface TeamSetupWizardProps {
  onComplete: () => void;
}

export function TeamSetupWizard({ onComplete }: TeamSetupWizardProps) {
  const router = useRouter();
  const tenantId = useAuthStore((s) => s.user?.tenantId ?? "");
  const [step, setStep] = React.useState<WizardStep>("ai-modal");
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [abigailCeo, setAbigailCeo] = React.useState<Agent | null>(null);
  const [loadingTeam, setLoadingTeam] = React.useState(false);

  // Interview state
  const [messages, setMessages] = React.useState<Message[]>([OPENING_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [interviewPhase, setInterviewPhase] = React.useState<"chat" | "creating" | "done">("chat");
  const [questionCount, setQuestionCount] = React.useState(0);
  const [newAgent, setNewAgent] = React.useState<Agent | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load team after coordinator is set
  async function loadTeam() {
    setLoadingTeam(true);
    try {
      const [scopeRes, orgRes] = await Promise.all([
        fetchCoordinatorScope(),
        fetchOrgChart(),
      ]);
      // Show scope agents (tenant team) excluding hidden roles
      const scopeAgents = scopeRes.data.data.filter(
        (a) => !HIDDEN_ROLES.has(a.role),
      );
      setAgents(scopeAgents);

      // Find Abigail global-ceo from full org chart
      const gCeo = orgRes.data.data.find((a) => a.role === "global-ceo") ?? null;
      setAbigailCeo(gCeo);
    } catch {
      // proceed without team data
    } finally {
      setLoadingTeam(false);
    }
  }

  function handleAiModalComplete() {
    if (tenantId) markSetupComplete(tenantId);
    loadTeam();
    setStep("team");
  }

  // ── Inline rename ─────────────────────────────────────────────────────────

  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);

  async function commitRename(agent: Agent) {
    if (!renameValue.trim() || renameValue.trim() === agent.name) {
      setRenamingId(null);
      return;
    }
    setRenaming(true);
    try {
      await updateAgent(agent.id, { name: renameValue.trim() });
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, name: renameValue.trim() } : a)),
      );
    } catch {
      // ignore — keep old name
    } finally {
      setRenaming(false);
      setRenamingId(null);
    }
  }

  // ── Interview: send a message ─────────────────────────────────────────────

  async function sendInterview(userText: string) {
    if (!userText.trim() || interviewPhase !== "chat") return;
    const text = userText.trim();
    setInput("");

    const updated: Message[] = [...messages, { role: "user", content: text }];
    setMessages(updated);
    const count = questionCount + 1;
    setQuestionCount(count);

    // After 3 rounds of Q&A, synthesize and create agent
    if (count >= 3) {
      setMessages((prev) => [
        ...prev,
        {
          role: "abigail",
          content: `Perfect — I have everything I need. Let me define this agent now…`,
        },
      ]);
      setInterviewPhase("creating");
      await synthesizeAndCreate(updated);
      return;
    }

    // Ask a follow-up based on what turn we're on
    const followUps = [
      `Good. Now tell me their expertise — what domain or technology do they specialise in? For example: "backend APIs", "security auditing", "test automation", "DevOps pipelines".`,
      `Last question: What's the one rule this agent must always follow? Think of it as their prime directive — the thing that defines their quality bar.`,
    ];

    setMessages((prev) => [
      ...prev,
      { role: "abigail", content: followUps[count - 1] ?? followUps[1] },
    ]);
  }

  async function synthesizeAndCreate(conversation: Message[]) {
    // Extract answers from conversation turns (user messages in order)
    const userMessages = conversation
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const jobDescription = userMessages[0] ?? "General purpose agent";
    const domain = extractDomain(userMessages[1] ?? "general");
    const rule = userMessages[2] ?? "Always produce high-quality, tested output";

    // Derive name and role from job description
    const { name, role } = deriveNameAndRole(jobDescription, domain);

    try {
      const scopeRes = await fetchCoordinatorScope();
      const coordinator = scopeRes.data.data.find((a) => a.role === "coordinator");

      const res = await api.post<{ data: Agent }>("/agents", {
        name,
        role,
        domain,
        title: jobDescription.slice(0, 80),
        reportsToId: coordinator?.id,
        tenantId: coordinator?.tenantId,
        budgetMonthlyCents: 50000,
        adapterConfig: { primeDirective: rule },
      });

      const created = res.data.data;
      setNewAgent(created);
      setInterviewPhase("done");
      setMessages((prev) => [
        ...prev,
        {
          role: "abigail",
          content: `Done. I've added **${name}** to your team as ${ROLE_LABELS[role] ?? role}.\n\nTheir prime directive: "${rule}"\n\nYou can rename them from the team screen anytime.`,
        },
      ]);
      // Add to cards
      setAgents((prev) => [...prev, created]);
    } catch {
      setInterviewPhase("chat");
      setMessages((prev) => [
        ...prev,
        {
          role: "abigail",
          content: `Something went wrong creating that agent. Let's try again — tell me what they need to do.`,
        },
      ]);
    }
  }

  function extractDomain(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("backend") || lower.includes("api") || lower.includes("database")) return "backend";
    if (lower.includes("frontend") || lower.includes("ui") || lower.includes("component")) return "frontend";
    if (lower.includes("test") || lower.includes("qa") || lower.includes("coverage")) return "testing";
    if (lower.includes("security") || lower.includes("auth") || lower.includes("owasp")) return "security";
    if (lower.includes("devops") || lower.includes("docker") || lower.includes("deploy")) return "devops";
    if (lower.includes("docs") || lower.includes("readme") || lower.includes("documentation")) return "docs";
    if (lower.includes("data") || lower.includes("analytics") || lower.includes("ml")) return "data";
    return text.split(/\s+/).slice(0, 2).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "") || "general";
  }

  function deriveNameAndRole(description: string, domain: string): { name: string; role: string } {
    const lower = description.toLowerCase();
    // Check for known specialist names
    if (lower.includes("rex") || (lower.includes("backend") && lower.includes("engineer"))) return { name: "Rex", role: "specialist" };
    if (lower.includes("nova") || (lower.includes("frontend") && lower.includes("engineer"))) return { name: "Nova", role: "specialist" };
    if (lower.includes("kai") || lower.includes("review")) return { name: "Kai", role: "specialist" };
    if (lower.includes("sage") || lower.includes("test")) return { name: "Sage", role: "specialist" };
    if (lower.includes("atlas") || lower.includes("devops") || lower.includes("infra")) return { name: "Atlas", role: "specialist" };
    if (lower.includes("pixel") || lower.includes("debug")) return { name: "Pixel", role: "specialist" };
    if (lower.includes("felix") || lower.includes("security") || lower.includes("audit")) return { name: "Felix", role: "specialist" };
    if (lower.includes("luma") || lower.includes("doc")) return { name: "Luma", role: "specialist" };
    if (lower.includes("orion") || lower.includes("architect")) return { name: "Orion", role: "specialist" };
    if (lower.includes("vex") || lower.includes("pentest")) return { name: "Vex", role: "specialist" };

    // Generate a name from domain
    const domainNames: Record<string, string> = {
      backend: "Apex", frontend: "Pixel", testing: "Scout", security: "Shield",
      devops: "Atlas", docs: "Quill", data: "Iris", general: "Echo",
    };
    return {
      name: domainNames[domain] ?? "Agent",
      role: lower.includes("manager") || lower.includes("lead") ? "manager" : "specialist",
    };
  }

  function resetInterview() {
    setMessages([OPENING_MESSAGE]);
    setInput("");
    setInterviewPhase("chat");
    setQuestionCount(0);
    setNewAgent(null);
    setStep("team");
  }

  // ── Step: AI modal ────────────────────────────────────────────────────────

  if (step === "ai-modal") {
    return <SetupAIModal open={true} onComplete={handleAiModalComplete} />;
  }

  // ── Step: Interview ───────────────────────────────────────────────────────

  if (step === "interview") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
          <button
            onClick={resetInterview}
            className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-full bg-foreground/8 flex items-center justify-center">
              <Brain className="size-3.5 text-foreground/60" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-none">Abigail · The Brain</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Defining your new agent</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-2xl mx-auto w-full">
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
                  <div className="size-6 rounded-full bg-foreground/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="size-3 text-foreground/60" />
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

          {interviewPhase === "creating" && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="size-6 rounded-full bg-foreground/8 flex items-center justify-center shrink-0">
                  <Loader2 className="size-3 animate-spin text-foreground/60" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted/40 border border-border/40 text-[15px] text-muted-foreground">
                  Creating agent…
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {interviewPhase === "chat" && (
          <div className="shrink-0 px-4 py-4 max-w-2xl mx-auto w-full">
            <div className="flex items-end gap-2 bg-muted/40 rounded-[20px] px-3 py-2 border border-border/40">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendInterview(input);
                  }
                }}
                placeholder="Tell Abigail what this agent needs to do…"
                rows={1}
                autoFocus
                className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-[15px] py-1 placeholder:text-muted-foreground/40 min-h-[36px] max-h-[120px]"
              />
              <Button
                size="icon"
                disabled={!input.trim()}
                onClick={() => sendInterview(input)}
                className={cn(
                  "size-8 rounded-full shrink-0 transition-all",
                  input.trim() ? "bg-foreground text-background" : "bg-muted text-muted-foreground opacity-40",
                )}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {interviewPhase === "done" && (
          <div className="shrink-0 px-4 py-4 max-w-2xl mx-auto w-full">
            <Button
              onClick={resetInterview}
              className="w-full h-11 rounded-2xl text-[14px] font-medium"
            >
              Back to team
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── Step: Team cards ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pt-10 pb-6 space-y-1.5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
          Your AI Team
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Meet the crew
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Rename any agent or add new ones. Core platform agents are managed by Abigail.
        </p>
      </div>

      {/* Cards scroll area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
        {loadingTeam ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Abigail CEO — pinned, immutable */}
            {abigailCeo && (
              <div className="relative rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-4 overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-semibold tracking-widest text-violet-400/70 uppercase px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/10">
                    The Brain
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Brain className="size-5 text-violet-400/80" />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold">Abigail</p>
                    <p className="text-[12px] text-muted-foreground">Global CEO · AI Framework</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground/70 leading-relaxed">
                  Governs all industries, the Evolve Engine, memory, and specialist coordination. Platform singleton — cannot be renamed.
                </p>
              </div>
            )}

            {/* Tenant team agents */}
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isRenaming={renamingId === agent.id}
                renameValue={renameValue}
                renaming={renaming}
                onStartRename={() => {
                  setRenamingId(agent.id);
                  setRenameValue(agent.name);
                }}
                onRenameChange={setRenameValue}
                onCommitRename={() => commitRename(agent)}
                onCancelRename={() => setRenamingId(null)}
              />
            ))}

            {/* Add new agent card */}
            <button
              onClick={() => {
                if (tenantId) markSetupComplete(tenantId);
                onComplete();
                router.push("/coding/team/manage?hire=1");
              }}
              className="w-full rounded-2xl border border-dashed border-border/50 bg-muted/10 p-4 flex items-center gap-3 hover:border-foreground/20 hover:bg-muted/20 transition-all group"
            >
              <div className="size-10 rounded-xl border border-dashed border-border/60 flex items-center justify-center shrink-0 group-hover:border-foreground/30 transition-colors">
                <Plus className="size-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-[14px] font-medium text-foreground/70 group-hover:text-foreground transition-colors">Add new agent</p>
                <p className="text-[12px] text-muted-foreground">Abigail will interview you to define this agent's rules and scope</p>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-5 border-t border-border/40 bg-background/80 backdrop-blur-sm">
        <Button
          onClick={() => {
            if (tenantId) markSetupComplete(tenantId);
            onComplete();
          }}
          className="w-full h-11 rounded-2xl text-[14px] font-medium"
        >
          Go to workspace
          <ArrowRight className="size-4 ml-2" />
        </Button>
        <p className="text-[11px] text-center text-muted-foreground/50 mt-2.5">
          You can manage your team anytime from the Team page
        </p>
      </div>
    </div>
  );
}

// ── AgentCard sub-component ──────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent;
  isRenaming: boolean;
  renameValue: string;
  renaming: boolean;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

function AgentCard({
  agent, isRenaming, renameValue, renaming,
  onStartRename, onRenameChange, onCommitRename, onCancelRename,
}: AgentCardProps) {
  const colorClass = ROLE_COLORS[agent.role] ?? ROLE_COLORS.specialist;

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br p-4", colorClass)}>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-background/30 flex items-center justify-center shrink-0">
          <UserRound className="size-4.5 text-foreground/50" />
        </div>

        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <input
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitRename();
                  if (e.key === "Escape") onCancelRename();
                }}
                autoFocus
                maxLength={32}
                className="bg-transparent border-b border-foreground/30 focus:border-foreground/60 outline-none text-[15px] font-medium w-full transition-colors"
              />
              <button
                onClick={onCommitRename}
                disabled={renaming}
                className="text-emerald-500 hover:text-emerald-400 transition-colors shrink-0"
              >
                {renaming ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </button>
              <button onClick={onCancelRename} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold truncate">{agent.name}</p>
              <button
                onClick={onStartRename}
                className="text-muted-foreground/40 hover:text-foreground/60 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                <Pencil className="size-3" />
              </button>
            </div>
          )}
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {ROLE_LABELS[agent.role] ?? agent.role}
            {agent.domain ? ` · ${agent.domain}` : ""}
          </p>
        </div>

        {!isRenaming && (
          <button
            onClick={onStartRename}
            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-background/30 transition-colors shrink-0"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
