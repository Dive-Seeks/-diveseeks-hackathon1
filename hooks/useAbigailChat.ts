'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import type { UIMessage } from 'ai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { useCodingStore } from '@/lib/coding-store';
import { fetchUserChatHistory } from '@/lib/api/user-chat';
import { useRef, useCallback } from 'react';
import type { ModelTier } from '@/components/ai-chat/workflow-chat/types';

// Backward-compat: expose content string extracted from parts so existing components keep working
export type ChatMessage = UIMessage & { content: string; specialist?: string };

interface UseAbigailChatOptions {
  team?: 'coding' | 'general' | 'research';
  historyMode?: string;
}

export function useAbigailChat({ team }: UseAbigailChatOptions = {}) {
  const { user, isHydrated, isAuthenticated } = useAuthStore();
  const { activeProjects } = useCodingStore();
  const project = team ? activeProjects?.[team] : null;
  const projectId = project?.id ?? null;
  const queryClient = useQueryClient();

  // Mutable refs — read at fetch time so every sendMessage picks up current values
  const contextFilterRef = useRef<string[]>([]);
  const modelTierRef = useRef<ModelTier>('balanced');

  const { data: initialMessages, isSuccess: historyLoaded } = useQuery({
    queryKey: ['chat', projectId],
    queryFn: () => fetchUserChatHistory(projectId!),
    enabled: !!projectId && isHydrated && isAuthenticated,
    staleTime: 30_000,
  });

  const { messages: rawMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/abigail/chat',
      fetch: async (url, options = {}) => {
        const token = (await import('@/lib/auth-store')).useAuthStore.getState().accessToken;
        const headers = new Headers((options as RequestInit).headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);

        // Inject per-message dynamic fields at request time
        const existingBody = JSON.parse(((options as RequestInit).body as string) ?? '{}');
        existingBody.contextFilter = contextFilterRef.current;
        existingBody.modelTier = modelTierRef.current;

        // Resolve active projectId from Zustand store at request time if null or missing
        if (!existingBody.projectId && team) {
          const currentProjectId = useCodingStore.getState().activeProjects?.[team]?.id;
          if (currentProjectId) {
            existingBody.projectId = currentProjectId;
          }
        }

        return fetch(url, {
          ...(options as RequestInit),
          headers,
          body: JSON.stringify(existingBody),
        });
      },
      body: {
        projectId,
        team,
        userId: user?.id,
      },
    }),
    messages: (initialMessages ?? []).map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      parts: [{ type: 'text' as const, text: m.content }],
    })),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', projectId] });
    },
  });

  const messages: ChatMessage[] = rawMessages.map(m => ({
    ...m,
    content: m.parts.filter(isTextUIPart).map(p => p.text).join(''),
  }));

  const sendWithContext = useCallback(
    (content: string, contextFilter: string[], modelTier: ModelTier) => {
      contextFilterRef.current = contextFilter;
      modelTierRef.current = modelTier;
      sendMessage({ text: content });
    },
    [sendMessage],
  );

  return {
    messages,
    send: (content: string) => sendWithContext(content, [], 'balanced'),
    sendWithContext,
    isLoading: status === 'streaming' || status === 'submitted',
    historyLoaded,
    activeSessionId: null,
  };
}
