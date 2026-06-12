"use client";

import * as React from "react";
import { Sparkles, Wand2, Lightbulb } from "lucide-react";
import { ChatCanvas } from "@/components/ai-chat/ChatCanvas";
import { ProjectChatSidebar } from "@/components/projects/ProjectChatSidebar";
import { VisionInterviewCanvas } from "@/components/projects/VisionInterviewCanvas";
import { TaskProgressBar } from "@/components/projects/TaskProgressBar";
import { useWorkflowChat } from "@/hooks/useWorkflowChat";
import { WorkflowChat } from "@/components/ai-chat/workflow-chat";
import { useCodingStore } from "@/lib/coding-store";
import { useProjectVision } from "@/hooks/useProjectVision";

const SUGGESTIONS = [
  { label: "Define architecture", icon: Sparkles },
  { label: "Plan first feature", icon: Wand2 },
  { label: "Set tech constraints", icon: Lightbulb },
];

export default function CodingProjectChatPage() {
  const { messages, send, isLoading, historyLoaded, activeSessionId, toggleExpanded } = useWorkflowChat("coding");
  const { activeProjects } = useCodingStore();
  const project = activeProjects?.coding;

  const { visionState, recheckVision } = useProjectVision(project?.id);
  const [workflowMode, setWorkflowMode] = React.useState<'autonomous' | 'canvas' | null>(null);

  const greeting = project?.name ?? "Project Chat";
  const subtitle = project
    ? "Chat with your Coding Team to plan architecture and features."
    : "Select a project from the sidebar to start chatting.";

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] w-full overflow-hidden bg-background">
      <div className="w-[30%] min-w-[280px] max-w-[400px] shrink-0 border-r border-border/40 overflow-hidden">
        <ProjectChatSidebar team="coding" />
      </div>
      {workflowMode === 'autonomous' && (
        <div className="absolute top-[calc(var(--header-height)+52px)] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[12px] text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          Abigail is running tasks in the background
        </div>
      )}
      <div className="flex-1 bg-background overflow-hidden">
        {project && visionState === "loading" ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="size-8 rounded-full border-2 border-amber-400/40 border-t-amber-400 animate-spin" />
              <span className="text-[13px]">Abigail is getting ready…</span>
            </div>
          </div>
        ) : project && visionState === "missing" ? (
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
            hasMessagesOverride={historyLoaded && messages.length > 0}
          >
            <WorkflowChat
              messages={messages}
              onToggleExpanded={toggleExpanded}
              isLoading={isLoading}
              activeSessionId={activeSessionId}
              projectId={project?.id}
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
      </div>
    </div>
  );
}
