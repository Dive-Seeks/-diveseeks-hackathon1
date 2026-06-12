'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAbigailChat } from './useAbigailChat';
import { useCodingStore } from '@/lib/coding-store';
import { useSocket } from '@/lib/socket-context';
import { getIdentity } from '@/lib/specialist-identities';
import { applyWorkBlockEvent } from './workBlockReducer';
import type { WorkBlocksState } from './workBlockReducer';
import type { WorkflowChatMessage, Citation, ModelTier } from '@/components/ai-chat/workflow-chat/types';

interface MessageExtras {
  thinkingMs?: number;
  citations?: Citation[];
  followUps?: string[];
}

export function useWorkflowChat(team: 'coding' | 'general' | 'research') {
  const base = useAbigailChat({ team, historyMode: 'sessions' });
  const { activeProjects } = useCodingStore();
  const projectId = activeProjects[team]?.id ?? null;
  const socket = useSocket();

  const [workBlocks, setWorkBlocks] = useState<WorkBlocksState>({});
  const [messageExtras, setMessageExtras] = useState<Record<number, MessageExtras>>({});
  const pendingIdxRef = useRef<number | null>(null);
  const prevLengthRef = useRef(0);
  const hiddenIndicesRef = useRef<Set<number>>(new Set());

  const send = useCallback(
    (message: string) => {
      const newIdx = base.messages.length;
      pendingIdxRef.current = newIdx;
      setWorkBlocks(prev => applyWorkBlockEvent(prev, null, { type: 'INIT', messageIdx: newIdx }));
      base.send(message);
    },
    [base],
  );

  const sendWithContext = useCallback(
    (message: string, contextFilter: string[], modelTier: ModelTier) => {
      const newIdx = base.messages.length;
      pendingIdxRef.current = newIdx;
      setWorkBlocks(prev => applyWorkBlockEvent(prev, null, { type: 'INIT', messageIdx: newIdx }));
      base.sendWithContext(message, contextFilter, modelTier);
    },
    [base],
  );

  const sendHidden = useCallback(
    (message: string) => {
      const newIdx = base.messages.length;
      hiddenIndicesRef.current.add(newIdx);
      base.send(message);
    },
    [base],
  );

  const toggleExpanded = useCallback((messageId: string) => {
    const idx = parseInt(messageId, 10);
    setWorkBlocks(prev =>
      applyWorkBlockEvent(prev, pendingIdxRef.current, { type: 'TOGGLE_EXPANDED', messageIdx: idx }),
    );
  }, []);

  useEffect(() => {
    if (!projectId || !socket) return;

    const handler = (payload: any) => {
      if (!payload || payload.type !== 'agent_message' || payload.projectId !== projectId) return;
      const { fromAgent, interactionType, content, metadata } = payload;
      if (!fromAgent) return;
      const identity = getIdentity(fromAgent);

      if (fromAgent === 'abigail-mind') {
        if (interactionType === 'job_started') {
          setWorkBlocks(prev =>
            applyWorkBlockEvent(prev, pendingIdxRef.current, {
              type: 'AGENT_STEP',
              agentKey: 'abigail-mind',
              agentName: identity.displayName,
              summary: typeof content === 'string' ? content.slice(0, 80) : 'Coordinating...',
              stepStatus: 'pending',
            }),
          );
        } else if (interactionType === 'delegation_request') {
          const match = typeof content === 'string' ? content.match(/to (\w[\w-]*)\./) : null;
          const targetKey = match?.[1] ?? 'coordinator';
          const targetIdentity = getIdentity(targetKey);
          setWorkBlocks(prev =>
            applyWorkBlockEvent(prev, pendingIdxRef.current, {
              type: 'AGENT_STEP',
              agentKey: targetKey,
              agentName: targetIdentity.displayName,
              summary: 'Working on task...',
              stepStatus: 'pending',
            }),
          );
        } else if (interactionType === 'job_completed') {
          setWorkBlocks(prev =>
            applyWorkBlockEvent(prev, pendingIdxRef.current, {
              type: 'AGENT_STEP',
              agentKey: 'abigail-mind',
              agentName: identity.displayName,
              summary: 'Coordination complete',
              stepStatus: 'done',
            }),
          );
        }
      } else if (interactionType === 'job_completed') {
        setWorkBlocks(prev =>
          applyWorkBlockEvent(prev, pendingIdxRef.current, {
            type: 'AGENT_STEP',
            agentKey: fromAgent,
            agentName: identity.displayName,
            summary: typeof content === 'string' ? content.slice(0, 80) : 'Task completed',
            stepStatus: 'done',
          }),
        );

        // Extract enrichment metadata from job_completed
        if (metadata && pendingIdxRef.current !== null) {
          const idx = pendingIdxRef.current;
          setMessageExtras(prev => ({
            ...prev,
            [idx]: {
              thinkingMs: typeof metadata.thinkingMs === 'number' ? metadata.thinkingMs : undefined,
              citations: Array.isArray(metadata.citations) ? metadata.citations : undefined,
              followUps: Array.isArray(metadata.followUps) ? metadata.followUps : undefined,
            },
          }));
        }
      } else if (interactionType === 'follow_ups_ready') {
        // Separate event for follow-ups from AbigailMindService (after dispatch completes)
        if (metadata?.followUps && pendingIdxRef.current !== null) {
          const idx = pendingIdxRef.current;
          setMessageExtras(prev => ({
            ...prev,
            [idx]: {
              ...(prev[idx] ?? {}),
              followUps: Array.isArray(metadata.followUps) ? metadata.followUps : [],
            },
          }));
        }
      }
    };

    socket.on('project_feed_updated', handler);
    return () => { socket.off('project_feed_updated', handler); };
  }, [projectId, socket]);

  // Close active work block when assistant reply arrives
  useEffect(() => {
    const len = base.messages.length;
    if (len > prevLengthRef.current && pendingIdxRef.current !== null) {
      const lastMsg = base.messages[len - 1];
      if (lastMsg?.role === 'assistant') {
        const idx = pendingIdxRef.current;
        setWorkBlocks(prev => applyWorkBlockEvent(prev, idx, { type: 'CLOSE' }));
        pendingIdxRef.current = null;
      }
    }
    prevLengthRef.current = len;
  }, [base.messages]);

  // Compose base messages with work block + extras
  const messages: WorkflowChatMessage[] = base.messages.map((m, i) => ({
    ...m,
    id: String(i),
    workBlock: m.role === 'user' ? workBlocks[i] : undefined,
    hidden: hiddenIndicesRef.current.has(i),
    ...(m.role === 'assistant' ? (messageExtras[i - 1] ?? {}) : {}),
  }));

  return {
    messages,
    send,
    sendWithContext,
    sendHidden,
    isLoading: base.isLoading,
    historyLoaded: base.historyLoaded,
    activeSessionId: base.activeSessionId,
    toggleExpanded,
  };
}
