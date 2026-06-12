'use client';
import * as React from 'react';
import { Send, AlignLeft, Zap } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflowChat } from '@/hooks/useWorkflowChat';
import { WorkflowChat } from '@/components/ai-chat/workflow-chat';

interface ScopedDocChatProps {
  projectId: string;
  docId: string;
  specialistId: string;
  docTitle: string;
  team: 'coding' | 'general' | 'research';
}

const QUICK_ACTIONS = [
  { label: 'Summarise', icon: AlignLeft },
  { label: 'Explain', icon: Zap },
];

export function ScopedDocChat({ projectId, docId, specialistId, docTitle, team }: ScopedDocChatProps) {
  const [input, setInput] = React.useState('');
  const { messages, sendWithContext, isLoading, toggleExpanded } = useWorkflowChat(team);

  const send = (text: string) => {
    if (!text.trim()) return;
    sendWithContext(text, [specialistId], 'balanced');
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
          <p className="text-[13px] text-muted-foreground text-center">
            What would you like to know about this document?
          </p>
          <div className="flex gap-2">
            {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => send(label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-muted/20 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <Icon className="size-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <WorkflowChat
            messages={messages}
            onToggleExpanded={toggleExpanded}
            isLoading={isLoading}
            projectId={projectId}
            onRegenerate={send}
            onFollowUp={send}
          />
        </div>
      )}

      <div className="shrink-0 p-3 border-t border-border/30">
        <div className="flex items-end gap-2 bg-muted/40 rounded-2xl px-3 py-2 border border-border/40">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={`Ask about "${docTitle}"…`}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-[13px] py-1 min-h-[32px] max-h-[120px]"
          />
          <Button
            size="icon"
            disabled={!input.trim() || isLoading}
            onClick={() => send(input)}
            className={cn('size-7 rounded-full transition-all', input.trim() ? 'bg-foreground text-background' : 'opacity-40')}
          >
            <Send className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
