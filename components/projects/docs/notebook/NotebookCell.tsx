'use client';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CellAccent = 'amber' | 'green' | 'sky' | 'red' | 'purple' | 'neutral';
export interface CellStatus {
  label: string;
  tone: 'running' | 'done' | 'needs_review' | 'failed' | 'idle';
}

interface NotebookCellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: CellAccent;
  status?: CellStatus;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ACCENT_BORDER: Record<CellAccent, string> = {
  amber: 'border-l-amber-400/60',
  green: 'border-l-green-500/60',
  sky: 'border-l-sky-400/60',
  red: 'border-l-red-500/60',
  purple: 'border-l-purple-400/60',
  neutral: 'border-l-border',
};

const STATUS_TONE: Record<CellStatus['tone'], string> = {
  running: 'text-sky-400 bg-sky-400/10',
  done: 'text-green-400 bg-green-400/10',
  needs_review: 'text-amber-400 bg-amber-400/10',
  failed: 'text-red-400 bg-red-400/10',
  idle: 'text-muted-foreground bg-muted/40',
};

export function NotebookCell({
  icon, title, subtitle, accent = 'neutral', status, defaultOpen = true, children,
}: NotebookCellProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn('rounded-xl border border-border/50 border-l-2 bg-card/40 overflow-hidden', ACCENT_BORDER[accent])}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/30 transition-colors"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          {subtitle && <span className="truncate text-[11px] text-muted-foreground">{subtitle}</span>}
        </span>
        {status && (
          <span className={cn('ml-auto flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', STATUS_TONE[status.tone])}>
            {status.label}
          </span>
        )}
        <ChevronDown className={cn('size-4 flex-shrink-0 text-muted-foreground transition-transform', status ? '' : 'ml-auto', open ? '' : '-rotate-90')} />
      </button>
      {open && <div className="border-t border-border/40 px-3.5 py-3">{children}</div>}
    </div>
  );
}
