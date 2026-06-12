// hooks/useSseListener.ts
"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { useSocket } from "@/lib/socket-context";

export interface SseTaskCompleteEvent {
  teamId: string;
  sessionId: string;
  specialist: string;
  result: string;
  taskOutcome?: string;
  files?: { path: string; content: string }[];
}

export function useSseListener(
  onTaskComplete: (event: SseTaskCompleteEvent) => void,
) {
  const teamId = useAuthStore((s) => s.user?.tenantId);
  const socket = useSocket();
  const cbRef = useRef(onTaskComplete);

  useEffect(() => {
    cbRef.current = onTaskComplete;
  }, [onTaskComplete]);

  useEffect(() => {
    if (!teamId || !socket) return;

    const handler = (payload: SseTaskCompleteEvent) => {
      if (payload.teamId === teamId) {
        cbRef.current(payload);
      }
    };

    socket.on("task_complete", handler);

    return () => {
      socket.off("task_complete", handler);
    };

  }, [teamId, socket]);
}
