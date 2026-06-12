'use client';
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { SpecialistNodeData, SpecialistStatus } from '../../../lib/agent-canvas.types';
import { cn } from '../../../lib/utils';
import { AgentResultCard } from '../overlays/AgentResultCard';

function StatusBadge({ status }: { status: SpecialistStatus }) {
  if (status === 'idle') return null;

  const styles: Record<string, string> = {
    running:      'bg-sky-500',
    done:         'bg-green-500',
    failed:       'bg-red-500',
    needs_review: 'bg-amber-500',
  };

  const icons: Record<string, React.ReactNode> = {
    running:      <Loader2 size={10} className="animate-spin text-white" />,
    done:         <Check size={10} className="text-white" />,
    failed:       <X size={10} className="text-white" />,
    needs_review: <AlertTriangle size={10} className="text-white" />,
  };

  return (
    <div
      className={cn(
        'absolute flex items-center justify-center rounded-full z-10',
        styles[status],
      )}
      style={{ top: -8, right: -8, width: 18, height: 18, border: '1.5px solid #070b14' }}
    >
      {icons[status]}
    </div>
  );
}

function outcomeLabel(status: SpecialistStatus, at: number | null): string | null {
  if (!at) return null;
  const mins = Math.round((Date.now() - at) / 60_000);
  const ago = mins < 1 ? 'just now' : `${mins}m ago`;
  if (status === 'done')         return `âœ“ ${ago}`;
  if (status === 'failed')       return `âœ— ${ago}`;
  if (status === 'needs_review') return '~ Review';
  return null;
}

function outcomeColour(status: SpecialistStatus): string {
  if (status === 'done')         return 'text-green-500 bg-green-500/10';
  if (status === 'failed')       return 'text-red-400 bg-red-400/10';
  if (status === 'needs_review') return 'text-amber-400 bg-amber-400/10';
  return '';
}

export function SpecialistNode({ data }: NodeProps) {
  const d = data as unknown as SpecialistNodeData;
  const { entry, status, reportOutcome, currentTask } = d;
  const agentResult = d.agentResult;
  const isRunning = status === 'running';
  const label = outcomeLabel(status, reportOutcome?.at ?? null);

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-card px-3 py-3 flex flex-col items-center gap-1 w-44 transition-all duration-300',
        isRunning
          ? 'border-sky-400'
          : status === 'done'         ? 'border-green-500/50'
          : status === 'failed'       ? 'border-red-400/50'
          : status === 'needs_review' ? 'border-amber-400/50'
          : 'border-border',
      )}
      style={isRunning ? {
        animation: 'glowBip 1.4s ease-in-out infinite, borderShimmer 1.4s ease-in-out infinite',
      } : undefined}
    >
      <StatusBadge status={status} />
      {agentResult && <AgentResultCard result={agentResult} />}
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />

      {/* Avatar with animated ring when running */}
      <div className="relative">
        {isRunning && (
          <span
            className="absolute inset-0 rounded-full border-2 border-sky-400"
            style={{ animation: 'radarPing 1.4s ease-out infinite' }}
          />
        )}
        {entry.avatarPath ? (
          <img
            src={entry.avatarPath}
            alt={entry.displayName}
            className={cn(
              'w-11 h-11 rounded-full object-cover mb-0.5 ring-2 relative z-10',
              isRunning ? 'ring-sky-400' : 'ring-transparent',
            )}
          />
        ) : (
          <div
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white mb-0.5 ring-2 relative z-10',
              isRunning ? 'ring-sky-400' : 'ring-transparent',
            )}
            style={{ backgroundColor: entry.isCustom ? '#7C3AED' : entry.colour }}
          >
            {entry.monogram}
          </div>
        )}
      </div>

      <div className="text-[12px] font-semibold text-foreground leading-tight">{entry.displayName}</div>
      <div className="text-[10px] text-muted-foreground text-center leading-tight">{entry.description}</div>

      {entry.speciality && (
        <div className="text-[9px] text-muted-foreground/60 text-center leading-tight mt-0.5 truncate w-full px-1">
          {entry.speciality}
        </div>
      )}

      <div className="mt-1 min-h-[28px] flex flex-col items-center justify-center gap-0.5 w-full">
        {isRunning && (
          <>
            <span className="text-[10px] text-sky-400 font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-sky-400" style={{ animation: 'glowBip 0.8s ease-in-out infinite' }} />
              Workingâ€¦
            </span>
            {currentTask && (
              <span
                className="text-[9px] text-sky-300/80 text-center leading-tight w-full px-1 truncate"
                title={currentTask}
              >
                {currentTask.length > 45 ? currentTask.slice(0, 45) + 'â€¦' : currentTask}
              </span>
            )}
          </>
        )}
        {!isRunning && label && (
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', outcomeColour(status))}>
            {label}
          </span>
        )}
        {!isRunning && !label && (
          <span className="text-[10px] text-muted-foreground/50">Idle</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
}
