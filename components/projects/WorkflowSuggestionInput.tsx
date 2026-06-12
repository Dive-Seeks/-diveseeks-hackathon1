'use client';
import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Props {
  projectId: string;
}

export function WorkflowSuggestionInput({ projectId }: Props) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || status === 'sending') return;
    setStatus('sending');
    try {
      await api.post(`/project-feed/${projectId}/suggest`, { suggestion: trimmed });
      setValue('');
      setStatus('sent');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4"
      style={{ pointerEvents: 'all' }}
    >
      <div className="flex items-end gap-2 rounded-xl border border-border bg-card shadow-lg px-3 py-2">
        <textarea
          ref={textareaRef}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none max-h-20 leading-relaxed"
          placeholder="Add a suggestion for Abigail…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={status === 'sending'}
        />
        <button
          className={cn(
            'shrink-0 rounded-lg p-2 transition-colors',
            value.trim() && status !== 'sending'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
          onClick={submit}
          disabled={!value.trim() || status === 'sending'}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {status === 'sent' && (
        <p className="text-center text-xs text-green-500 mt-1.5">
          Queued for Abigail
        </p>
      )}
      {status === 'error' && (
        <p className="text-center text-xs text-red-400 mt-1.5">
          Could not reach Abigail — try again.
        </p>
      )}
    </div>
  );
}
