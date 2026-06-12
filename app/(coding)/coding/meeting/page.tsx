"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, GitBranch, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchActiveBrainSession,
  addBrainIdea,
  forkBrainThread,
  backBrainThread,
  completeBrainSession,
  fetchBrainSessionSummary,
} from "@/lib/abigail-api";
import type { BrainSession } from "@/lib/abigail-api";

export default function MeetingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const teamParam = searchParams.get("team") ?? "coding";
  const returnUrl =
    teamParam === "general" ? "/general/projects/chat" :
    teamParam === "research" ? "/research/projects/chat" :
    "/coding/projects/chat";

  const [session, setSession] = React.useState<BrainSession | null>(null);
  const [ideas, setIdeas] = React.useState<string[]>([""]);
  const [newIdea, setNewIdea] = React.useState("");
  const [forkName, setForkName] = React.useState("");
  const [forkTopic, setForkTopic] = React.useState("");
  const [showForkForm, setShowForkForm] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load or create session
  React.useEffect(() => {
    setLoading(true);
    fetchActiveBrainSession()
      .then((res) => {
        const s = res.data.data;
        if (s) {
          setSession(s);
          if (s.state === "complete") {
            fetchBrainSessionSummary(s.id).then((r) => setSummary(r.data.data.summary));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionIdParam]);

  const handleAddIdea = async () => {
    if (!session || !newIdea.trim()) return;
    setSaving(true);
    try {
      await addBrainIdea(session.id, {
        content: newIdea.trim(),
        batchNumber: session.ideaCount + 1,
      });
      setIdeas((prev) => [...prev, newIdea.trim()]);
      setNewIdea("");
      setSession((s) => s ? { ...s, ideaCount: s.ideaCount + 1 } : s);
    } finally {
      setSaving(false);
    }
  };

  const handleFork = async () => {
    if (!session || !forkName.trim() || !forkTopic.trim()) return;
    setSaving(true);
    try {
      await forkBrainThread(session.id, { name: forkName.trim(), topic: forkTopic.trim() });
      setSession((s) => s ? { ...s, currentThread: forkName.trim() } : s);
      setShowForkForm(false);
      setForkName("");
      setForkTopic("");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = async () => {
    if (!session) return;
    const res = await backBrainThread(session.id);
    setSession(res.data.data);
  };

  const handleComplete = async () => {
    if (!session || session.ideaCount === 0) return;
    setSaving(true);
    try {
      await completeBrainSession(session.id);
      const summaryRes = await fetchBrainSessionSummary(session.id);
      setSummary(summaryRes.data.data.summary);
      setSession((s) => s ? { ...s, state: "complete" } : s);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 py-20">
        <h2 className="text-xl font-semibold">No active brainstorm session</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          A brainstorm session opens automatically when you submit a feature or architecture request to Abigail.
        </p>
        <Button variant="outline" onClick={() => router.push(returnUrl)}>
          Back to Chat
        </Button>
      </div>
    );
  }

  if (session.state === "complete" && summary) {
    return (
      <div className="flex flex-col max-w-2xl mx-auto w-full h-full py-10 px-6 gap-6">
        <div className="flex items-center gap-2 text-emerald-500">
          <CheckCircle2 className="size-5" />
          <h2 className="text-lg font-semibold">Brainstorm Complete</h2>
        </div>
        <div className="rounded-2xl bg-muted/20 border border-border/40 p-5 whitespace-pre-wrap text-[14px] text-foreground/90 leading-relaxed">
          {summary}
        </div>
        <Button onClick={() => router.push(returnUrl)}>
          Return to Chat — Abigail will now proceed
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto w-full h-full py-10 px-6 gap-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
          <span className="font-mono">Thread: {session.currentThread}</span>
          {session.currentThread !== "MAIN" && (
            <button onClick={handleBack} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="size-3" /> back
            </button>
          )}
        </div>
        <h2 className="text-xl font-semibold">{session.topic}</h2>
        <p className="text-sm text-muted-foreground capitalize">Technique: {session.technique}</p>
      </div>

      {/* Ideas */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {ideas.filter(Boolean).map((idea, i) => (
          <div key={i} className="rounded-xl bg-muted/20 border border-border/40 px-4 py-2.5 text-[14px]">
            {idea}
          </div>
        ))}
      </div>

      {/* Add idea */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-xl bg-muted/20 border border-border/40 px-4 py-2.5 text-[14px] outline-none focus:border-primary/40"
          placeholder="Add an idea..."
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddIdea()}
        />
        <Button size="sm" onClick={handleAddIdea} disabled={saving || !newIdea.trim()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </div>

      {/* Fork form */}
      {showForkForm ? (
        <div className="space-y-2 rounded-2xl bg-muted/10 border border-border/40 p-4">
          <input
            className="w-full rounded-xl bg-muted/20 border border-border/40 px-3 py-2 text-[13px] outline-none"
            placeholder="Thread name"
            value={forkName}
            onChange={(e) => setForkName(e.target.value)}
          />
          <input
            className="w-full rounded-xl bg-muted/20 border border-border/40 px-3 py-2 text-[13px] outline-none"
            placeholder="Thread topic"
            value={forkTopic}
            onChange={(e) => setForkTopic(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleFork} disabled={saving}>Fork</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForkForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setShowForkForm(true)}
        >
          <GitBranch className="size-4 mr-1" /> Fork thread
        </Button>
      )}

      {/* Complete */}
      <Button
        onClick={handleComplete}
        disabled={session.ideaCount === 0 || saving}
        className="w-full"
      >
        {saving
          ? <><Loader2 className="size-4 animate-spin mr-2" /> Generating summary...</>
          : "Complete brainstorm — let Abigail proceed"
        }
      </Button>
    </div>
  );
}
