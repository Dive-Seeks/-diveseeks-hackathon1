'use client';
import * as React from 'react';
import { ChatMessageItem } from './ChatMessageItem';
import type { WorkflowChatMessage, Citation } from './types';

interface WorkflowChatProps {
  messages: WorkflowChatMessage[];
  syntheticMessages?: Array<{ id: string; content: string; createdAt: number }>;
  onToggleExpanded: (messageId: string) => void;
  isLoading?: boolean;
  activeSessionId?: string | null;
  projectId?: string;
  sourcesOpen?: boolean;
  activeCitations?: Citation[];
  onSourcesToggle?: (citations: Citation[]) => void;
  onRegenerate?: (message: string) => void;
  onFollowUp?: (text: string) => void;
}

export function WorkflowChat({
  messages,
  syntheticMessages,
  onToggleExpanded,
  isLoading,
  activeSessionId,
  projectId = '',
  sourcesOpen = false,
  activeCitations = [],
  onSourcesToggle,
  onRegenerate,
  onFollowUp,
}: WorkflowChatProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  const lastMessage = messages[messages.length - 1];
  const showSpinner =
    isLoading &&
    !activeSessionId &&
    (!lastMessage?.workBlock || lastMessage.workBlock.status === 'done');

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4">
      {syntheticMessages?.map((msg) => (
        <div key={msg.id} className="max-w-3xl mx-auto w-full px-4 py-2 border-l-2 border-amber-400/30 bg-amber-400/5 rounded-r text-[12px] text-muted-foreground italic">
          {msg.content}
        </div>
      ))}
      {messages.filter(m => !m.hidden).map(m => (
        <ChatMessageItem
          key={m.id}
          message={m}
          onToggleExpanded={() => onToggleExpanded(m.id)}
          onCitationClick={() => onSourcesToggle?.(m.citations ?? [])}
          onSourcesToggle={() => onSourcesToggle?.(m.citations ?? [])}
          sourcesOpen={sourcesOpen && (m.citations?.length ?? 0) > 0 && m.citations === activeCitations}
          onRegenerate={() => onRegenerate?.(lastUserMessage?.content ?? '')}
          onFollowUp={text => onFollowUp?.(text)}
          projectId={projectId}
        />
      ))}
      {showSpinner && (
        <div className="flex justify-start animate-in fade-in duration-300">
          <div className="rounded-2xl px-4 py-2.5 bg-muted/40 border border-border/40 text-muted-foreground text-[15px]">
            <span className="animate-pulse">Abigail is thinking...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
