'use client';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CoordinatorNodeData } from '../../../lib/agent-canvas.types';
import { cn } from '../../../lib/utils';
import { CoordinatorReadingOverlay } from '../overlays/CoordinatorReadingOverlay';

export function CoordinatorNode({ data }: NodeProps) {
  const d = data as unknown as CoordinatorNodeData;
  const isRunning = d.status === 'running';
  const isReading = d.reading === true;

  return (
    <div className="relative flex flex-col items-center">
      {/* Radar ping rings — visible only when running */}
      {isRunning && (
        <>
          <span
            className="absolute inset-0 rounded-2xl border-2 border-sky-400/60 pointer-events-none"
            style={{ animation: 'radarPing 1.6s ease-out infinite' }}
          />
          <span
            className="absolute inset-0 rounded-2xl border-2 border-sky-400/40 pointer-events-none"
            style={{ animation: 'radarPing 1.6s ease-out 0.5s infinite' }}
          />
        </>
      )}

      {/* Active task pill */}
      <div
        className={cn(
          'absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-300',
          isRunning
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-1 pointer-events-none',
        )}
        style={{
          background: 'rgba(99,102,241,0.9)',
          border: '1px solid #818cf8',
          color: '#e0e7ff',
        }}
      >
        ⚡ {d.currentTask
          ? `Delegating to ${d.currentTask.replace(/.*Delegating to ([\w-]+).*/, '$1')}…`
          : 'Working…'}
      </div>

      <div
        className={cn(
          'rounded-2xl border-2 px-6 py-4 flex flex-col items-center gap-1 min-w-[200px] transition-all duration-300',
          isRunning ? 'border-sky-400/80 bg-sky-400/5' : 'border-border bg-card shadow-sm',
        )}
        style={isRunning ? {
          animation: 'glowBip 1.4s ease-in-out infinite',
        } : undefined}
      >
        <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-slate-400" />

        {d.avatarPath ? (
          <img
            src={d.avatarPath}
            alt={d.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-border mb-1"
          />
        ) : (
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mb-1 ring-2',
              isRunning ? 'ring-sky-400' : 'ring-transparent',
            )}
            style={{ backgroundColor: '#64748B' }}
          >
            {d.monogram}
          </div>
        )}

        <div className="text-sm font-bold text-foreground">{d.name}</div>
        <div className="text-[11px] text-muted-foreground font-medium">Abigail Coordinator</div>

        <div className={cn(
          'flex items-center gap-1.5 mt-1 text-[11px] font-medium',
          isRunning ? 'text-sky-400' : 'text-muted-foreground',
        )}>
          <span
            className={cn('size-1.5 rounded-full', isRunning ? 'bg-sky-400' : 'bg-slate-500')}
            style={isRunning ? { animation: 'glowBip 0.8s ease-in-out infinite' } : undefined}
          />
          {isRunning
            ? <span className="truncate max-w-[140px]" title={d.currentTask}>
                {d.currentTask?.replace(/^Starting:\s*/i, '').slice(0, 50) ?? 'Working…'}
              </span>
            : 'Idle'
          }
        </div>

        <CoordinatorReadingOverlay visible={isReading && !isRunning} />

        <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-slate-400" />
      </div>
    </div>
  );
}
