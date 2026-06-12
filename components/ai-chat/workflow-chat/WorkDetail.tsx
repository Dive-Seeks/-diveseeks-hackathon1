'use client';
import * as React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentStepRow } from './AgentStepRow';
import type { AgentStep } from './types';

interface WorkDetailProps {
  steps: AgentStep[];
  expanded: boolean;
  onToggle: () => void;
  status: 'active' | 'done' | 'error';
}

export function WorkDetail({ steps, expanded, onToggle, status }: WorkDetailProps) {
  if (steps.length === 0 && status === 'active') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1.5 mt-1">
        <span className="size-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        Working...
      </div>
    );
  }

  if (steps.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        {steps.length} {steps.length === 1 ? 'agent' : 'agents'} worked on this
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-150',
          expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="pl-5 border-l border-border/40 mt-1 space-y-0.5">
          {steps.map((step, i) => (
            <AgentStepRow key={`${step.agentKey}-${i}`} step={step} />
          ))}
        </div>
      </div>
    </div>
  );
}
