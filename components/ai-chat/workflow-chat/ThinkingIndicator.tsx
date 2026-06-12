'use client';
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkDetail } from './WorkDetail';
import type { AgentStep } from './types';

interface ThinkingIndicatorProps {
  ms: number;
  steps: AgentStep[];
}

function formatMs(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 1 ? '< 1s' : `${s}s`;
}

export function ThinkingIndicator({ ms, steps }: ThinkingIndicatorProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
      >
        <span>Thought for {formatMs(ms)}</span>
        <ChevronRight className={cn('size-3 transition-transform', expanded && 'rotate-90')} />
      </button>

      {expanded && steps.length > 0 && (
        <div className="mt-1 pl-2 border-l border-border/30">
          <WorkDetail steps={steps} expanded={true} onToggle={() => {}} status="done" />
        </div>
      )}
    </div>
  );
}
