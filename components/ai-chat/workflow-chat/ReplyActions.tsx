'use client';
import * as React from 'react';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Citation } from './types';

interface ReplyActionsProps {
  content: string;
  citations: Citation[];
  sourcesOpen: boolean;
  onSourcesToggle: () => void;
  onRegenerate: () => void;
}

export function ReplyActions({ content, citations, sourcesOpen, onSourcesToggle, onRegenerate }: ReplyActionsProps) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<'like' | 'dislike' | null>(null);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={copy}
        title="Copy"
        className={cn('p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors', copied && 'text-green-500')}
      >
        <Copy className="size-3.5" />
      </button>

      <button
        onClick={onRegenerate}
        title="Regenerate"
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <RefreshCw className="size-3.5" />
      </button>

      <button
        onClick={() => setFeedback('like')}
        className={cn('p-1.5 rounded-md transition-colors', feedback === 'like' ? 'text-green-500' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40')}
      >
        <ThumbsUp className="size-3.5" />
      </button>

      <button
        onClick={() => setFeedback('dislike')}
        className={cn('p-1.5 rounded-md transition-colors', feedback === 'dislike' ? 'text-red-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40')}
      >
        <ThumbsDown className="size-3.5" />
      </button>

      {citations.length > 0 && (
        <button
          onClick={onSourcesToggle}
          className={cn(
            'ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors',
            sourcesOpen
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground',
          )}
        >
          <BookOpen className="size-3" />
          Sources ({citations.length})
        </button>
      )}
    </div>
  );
}
