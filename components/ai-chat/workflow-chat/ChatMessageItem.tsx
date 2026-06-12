'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { WorkBlock } from './WorkBlock';
import { CitationRenderer } from './CitationRenderer';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ReplyActions } from './ReplyActions';
import { FollowUpChips } from './FollowUpChips';
import { SaveToDocDropdown } from './SaveToDocDropdown';
import type { WorkflowChatMessage, Citation } from './types';

interface ChatMessageItemProps {
  message: WorkflowChatMessage;
  onToggleExpanded: () => void;
  onCitationClick: (citation: Citation) => void;
  onSourcesToggle: () => void;
  sourcesOpen: boolean;
  onRegenerate: () => void;
  onFollowUp: (text: string) => void;
  projectId: string;
}

export function ChatMessageItem({
  message,
  onToggleExpanded,
  onCitationClick,
  onSourcesToggle,
  sourcesOpen,
  onRegenerate,
  onFollowUp,
  projectId,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';
  const citations = message.citations ?? [];
  const steps = message.workBlock?.agentSteps ?? [];

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div className={cn('flex flex-col gap-1 max-w-[85%]', isUser && 'items-end w-full')}>
        {!isUser && message.specialist && (
          <span className="text-[11px] text-muted-foreground font-medium capitalize px-1">
            {message.specialist}
          </span>
        )}

        {!isUser && message.thinkingMs !== undefined && (
          <ThinkingIndicator ms={message.thinkingMs} steps={steps} />
        )}

        <div
          className={cn(
            'px-4 py-2.5 text-[15px] leading-relaxed',
            isUser
              ? 'rounded-2xl rounded-br-sm bg-foreground text-background'
              : 'rounded-2xl rounded-bl-sm bg-muted/40 border border-border/40',
            isUser && message.workBlock ? 'rounded-b-none border border-border/40 border-b-0' : '',
          )}
        >
          {isUser
            ? message.content
            : (
              <CitationRenderer
                content={message.content}
                citations={citations}
                onCitationClick={onCitationClick}
              />
            )
          }
        </div>

        {isUser && message.workBlock && (
          <WorkBlock workBlock={message.workBlock} onToggleExpanded={onToggleExpanded} />
        )}

        {!isUser && (
          <>
            <ReplyActions
              content={message.content}
              citations={citations}
              sourcesOpen={sourcesOpen}
              onSourcesToggle={onSourcesToggle}
              onRegenerate={onRegenerate}
            />
            {(message.followUps?.length ?? 0) > 0 && (
              <FollowUpChips suggestions={message.followUps!} onSelect={onFollowUp} />
            )}
            <div className="flex justify-end mt-1 w-full">
              <SaveToDocDropdown content={message.content} projectId={projectId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
