"use client";

import * as React from "react";
import { use } from "react";
import { Sparkles, Wand2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { VisionInterviewCanvas } from "@/components/projects/VisionInterviewCanvas";
import { TaskProgressBar } from "@/components/projects/TaskProgressBar";
import { ProjectLiveFeed } from "@/components/projects/ProjectLiveFeed";
import { useWorkflowChat } from "@/hooks/useWorkflowChat";
import { WorkflowChat } from "@/components/ai-chat/workflow-chat";
import { SourcesDrawer } from "@/components/ai-chat/workflow-chat/SourcesDrawer";
import { useCodingStore } from "@/lib/coding-store";
import { useProjectVision } from "@/hooks/useProjectVision";
import { listProjects } from "@/lib/projects-api";
import { useAuthStore } from "@/lib/auth-store";
import { AgentCanvas } from '@/components/agent-canvas/AgentCanvas';
import { useCanvasLiveData } from '@/hooks/useCanvasLiveData';
import { DocumentsPanel } from '@/components/projects/documents/DocumentsPanel';
import type { Citation } from '@/components/ai-chat/workflow-chat/types';
import { WorkflowRunButton } from '@/components/projects/WorkflowRunButton';
import { useCanvasStore } from '@/lib/canvas-live-store';

const SUGGESTIONS = [
  { label: "Define project goals", icon: Sparkles },
  { label: "Map requirements", icon: Wand2 },
  { label: "Identify constraints", icon: Lightbulb },
];

export default function GeneralWorkflowProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { isHydrated, isAuthenticated } = useAuthStore();
  const { activeProjects, setActiveProject } = useCodingStore();
  const [view, setView] = React.useState<'chat' | 'canvas' | 'docs'>('chat');
  const [workflowMode, setWorkflowMode] = React.useState<'autonomous' | 'canvas' | null>(null);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const [activeCitations, setActiveCitations] = React.useState<Citation[]>([]);

  React.useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    const current = activeProjects.general;
    if (current?.id === projectId) return;
    listProjects()
      .then((res) => {
        const match = (res.data.data as { id: string; name: string; description?: string | null; team: string; workflowType?: 'autonomous' | 'canvas' | null }[])
          .find((p) => p.id === projectId && p.team === "general");
        if (match) {
          setActiveProject("general", match.id, match.name, match.description);
          if (match.workflowType) setWorkflowMode(match.workflowType);
        }
      })
      .catch(() => {});
  }, [isHydrated, isAuthenticated, projectId, activeProjects.general, setActiveProject]);

  const { messages, send, sendWithContext, sendHidden, isLoading, historyLoaded, activeSessionId, toggleExpanded } = useWorkflowChat("general");
  const project = activeProjects?.general;

  const rawCanvasData = useCanvasLiveData(projectId, "general");

  const canvasData = React.useMemo(() => ({
    ...rawCanvasData,
    runWorkflow: async () => {
      await rawCanvasData.runWorkflow();
      // Only narrate to the chat if the workflow actually dispatched (running flipped true).
      if (useCanvasStore.getState().byProject[projectId]?.running) {
        sendHidden("The autonomous workflow has just been started. Briefly acknowledge that you are now running the project tasks in the background and what the team will be working on.");
      }
    },
    pauseWorkflow: async () => {
      sendHidden("The autonomous workflow has just been paused.");
      await rawCanvasData.pauseWorkflow();
    },
    resumeWorkflow: async () => {
      sendHidden("The autonomous workflow has just been resumed.");
      await rawCanvasData.resumeWorkflow();
    },
  }), [rawCanvasData, sendHidden, projectId]);

  const { visionState, recheckVision } = useProjectVision(project?.id === projectId ? project.id : null);

  const greeting = project?.name ?? "Project Chat";
  const subtitle = project
    ? "Chat with your General Team to define goals and scope."
    : "Loading project…";

  const handleSourcesToggle = (citations: Citation[]) => {
    if (sourcesOpen && activeCitations === citations) {
      setSourcesOpen(false);
    } else {
      setActiveCitations(citations);
      setSourcesOpen(true);
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      <div className="flex-1 relative bg-background overflow-hidden">
        {workflowMode === 'autonomous' && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[12px] text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Abigail is running tasks in the background
          </div>
        )}
        <div className="pointer-events-none absolute top-3 inset-x-4 z-20 flex items-start gap-3">
          <div className="pointer-events-auto flex min-w-0 flex-1 justify-start">
            {project?.id === projectId && (
              <WorkflowRunButton
                projectId={projectId}
                team="general"
                onRun={canvasData.runWorkflow}
                onPause={canvasData.pauseWorkflow}
                onResume={canvasData.resumeWorkflow}
              />
            )}
          </div>
          <div className="pointer-events-auto flex shrink-0 rounded-full border border-border bg-card shadow-sm">
            {(['chat', 'canvas', 'docs'] as const).map((v) => (
            <button
              key={v}
              className={cn(
                'text-xs px-4 py-1.5 rounded-full capitalize transition-colors',
                view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
          </div>
          <div className="hidden flex-1 sm:block" />
        </div>
        {view === 'canvas' && project?.id === projectId ? (
          <AgentCanvas
            data={canvasData}
            projectId={projectId}
            projectName={project?.name}
          />
        ) : view === 'docs' && project?.id === projectId ? (
          <DocumentsPanel
            projectId={projectId}
            team="general"
            onDocOpen={(title, snippet) =>
              sendHidden(`The user just opened the document "${title}". Briefly summarise what this document is about based on this excerpt:\n\n${snippet}`)
            }
          />
        ) : (
          <>
            {project?.id === projectId && visionState === "loading" ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="size-8 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
                  <span className="text-[13px]">Abigail is getting ready…</span>
                </div>
              </div>
            ) : project?.id === projectId && visionState === "missing" ? (
              <VisionInterviewCanvas
                projectId={project.id}
                projectName={project.name}
                projectDescription={project.description ?? undefined}
                onVisionReady={(wf) => { setWorkflowMode(wf); recheckVision(); }}
              />
            ) : (
              <ChatCanvas
                greeting={greeting}
                subtitle={subtitle}
                suggestions={SUGGESTIONS}
                onSend={send}
                onSendWithContext={sendWithContext}
                hasMessagesOverride={historyLoaded && messages.length > 0}
              >
                <WorkflowChat
                  messages={messages}
                  syntheticMessages={canvasData.syntheticMessages}
                  onToggleExpanded={toggleExpanded}
                  isLoading={isLoading}
                  activeSessionId={activeSessionId}
                  projectId={projectId}
                  sourcesOpen={sourcesOpen}
                  activeCitations={activeCitations}
                  onSourcesToggle={handleSourcesToggle}
                  onRegenerate={send}
                  onFollowUp={send}
                />
                {isLoading && activeSessionId && (
                  <div className="max-w-3xl mx-auto w-full animate-in fade-in duration-300 mt-4">
                    <TaskProgressBar sessionId={activeSessionId} />
                  </div>
                )}
              </ChatCanvas>
            )}
          </>
        )}
      </div>

      {project?.id === projectId && (
        <div className="w-80 border-l hidden lg:flex bg-background">
          {sourcesOpen && activeCitations.length > 0 ? (
            <SourcesDrawer
              citations={activeCitations}
              onClose={() => setSourcesOpen(false)}
              onOpenDoc={() => { setSourcesOpen(false); setView('docs'); }}
            />
          ) : (
            <ProjectLiveFeed projectId={project.id} />
          )}
        </div>
      )}
    </div>
  );
}
