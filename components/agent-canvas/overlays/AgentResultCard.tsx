'use client';
import { useState } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { AgentResultData } from '../../../lib/agent-canvas.types';

interface AgentResultCardProps {
  result: AgentResultData;
}

export function AgentResultCard({ result }: AgentResultCardProps) {
  const [open, setOpen] = useState(false);

  const badgeStyles = {
    done:         'bg-green-500/20 border-green-500/40 text-green-400',
    needs_review: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    blocked:      'bg-red-500/20 border-red-500/40 text-red-400',
  };

  const BadgeIcon = {
    done:         Check,
    needs_review: AlertTriangle,
    blocked:      X,
  }[result.outcome];

  return (
    <div className="relative">
      {/* Badge — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'absolute -top-2 -right-2 flex items-center justify-center rounded-full border z-20',
          'w-5 h-5 transition-transform hover:scale-110',
          badgeStyles[result.outcome],
        )}
        title={result.summary}
      >
        <BadgeIcon size={10} />
      </button>

      {/* Expanded card */}
      {open && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-2 w-56 rounded-xl border bg-zinc-900/98 p-3 shadow-xl z-30',
            'text-[11px] leading-relaxed',
            result.outcome === 'done' ? 'border-green-500/30' :
            result.outcome === 'needs_review' ? 'border-amber-500/30' : 'border-red-500/30',
          )}
        >
          <div className={cn('text-[10px] font-semibold uppercase tracking-wide mb-1.5', {
            'text-green-400': result.outcome === 'done',
            'text-amber-400': result.outcome === 'needs_review',
            'text-red-400': result.outcome === 'blocked',
          })}>
            {result.outcome === 'done' ? '✓ Done' : result.outcome === 'needs_review' ? '~ Needs Review' : '✗ Blocked'}
          </div>
          <p className="text-zinc-300">{result.summary}</p>
          {result.executorBackend && (
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide',
                  result.executorBackend === 'hermes'
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                    : result.executorBackend === 'adk'
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                      : 'border-zinc-600/50 bg-zinc-700/30 text-zinc-400',
                )}
              >
                via {result.executorBackend}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
