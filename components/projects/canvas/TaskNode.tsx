'use client';
import { Handle, Position, NodeProps, NodeToolbar } from '@xyflow/react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const SPECIALIST_COLORS: Record<string, string> = {
  rex: 'bg-blue-500',
  nova: 'bg-purple-500',
  kai: 'bg-teal-500',
  sage: 'bg-emerald-500',
  atlas: 'bg-orange-500',
  orion: 'bg-sky-500',
  pixel: 'bg-pink-500',
  luma: 'bg-violet-500',
  felix: 'bg-red-500',
  vex: 'bg-rose-500',
};

const SPECIALIST_IMAGES: Record<string, string> = {
  rex:   'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces&q=80',
  nova:  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=64&h=64&fit=crop&crop=faces&q=80',
  kai:   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces&q=80',
  sage:  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces&q=80',
  atlas: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=64&h=64&fit=crop&crop=faces&q=80',
  orion: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=64&h=64&fit=crop&crop=faces&q=80',
  pixel: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=64&h=64&fit=crop&crop=faces&q=80',
  luma:  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=faces&q=80',
  felix: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=64&h=64&fit=crop&crop=faces&q=80',
  vex:   'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=64&h=64&fit=crop&crop=faces&q=80',
};

const SPECIALIST_RINGS: Record<string, string> = {
  rex:   'ring-blue-400/60',
  nova:  'ring-purple-400/60',
  kai:   'ring-teal-400/60',
  sage:  'ring-emerald-400/60',
  atlas: 'ring-orange-400/60',
  orion: 'ring-sky-400/60',
  pixel: 'ring-pink-400/60',
  luma:  'ring-violet-400/60',
  felix: 'ring-red-400/60',
  vex:   'ring-rose-400/60',
};

const SPECIALIST_LABELS: Record<string, string> = {
  rex:   'Rex — Backend',
  nova:  'Nova — Frontend',
  kai:   'Kai — Reviewer',
  sage:  'Sage — Tests',
  atlas: 'Atlas — DevOps',
  orion: 'Orion — Architect',
  pixel: 'Pixel — Debugger',
  luma:  'Luma — Docs',
  felix: 'Felix — Security',
  vex:   'Vex — Pen Test',
};

const STATUS_RING: Record<string, string> = {
  queued: '',
  in_progress:
    'ring-2 ring-sky-400/60 shadow-[0_0_0_1px_rgba(56,189,248,0.18),0_0_24px_rgba(14,165,233,0.18)] animate-pulse',
  done: 'ring-2 ring-green-500/50',
  blocked: 'ring-2 ring-red-400/50',
};

export interface TaskNodeData {
  taskId: string;
  title: string;
  description: string;
  specialist: string;
  status: 'queued' | 'in_progress' | 'done' | 'blocked';
  source: 'tce' | 'user';
  onMarkDone: (taskId: string) => void;
  onMarkBlocked: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskNode({ data, selected }: NodeProps) {
  const d = data as unknown as TaskNodeData;
  const specialistColor = SPECIALIST_COLORS[d.specialist] ?? 'bg-zinc-500';
  const specialistRing = SPECIALIST_RINGS[d.specialist] ?? 'ring-zinc-400/60';
  const statusRing = STATUS_RING[d.status] ?? '';
  const canDelete = d.status !== 'in_progress';

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Bottom}>
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 shadow-md">
          {d.status !== 'done' && (
            <button
              className="flex items-center gap-1 text-[11px] text-green-500 hover:bg-green-500/10 rounded px-2 py-1 transition-colors"
              onClick={() => d.onMarkDone(d.taskId)}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Done
            </button>
          )}
          {d.status !== 'blocked' && (
            <button
              className="flex items-center gap-1 text-[11px] text-yellow-500 hover:bg-yellow-500/10 rounded px-2 py-1 transition-colors"
              onClick={() => d.onMarkBlocked(d.taskId)}
            >
              <XCircle className="h-3.5 w-3.5" />
              Block
            </button>
          )}
          {canDelete && (
            <button
              className="flex items-center gap-1 text-[11px] text-red-400 hover:bg-red-400/10 rounded px-2 py-1 transition-colors"
              onClick={() => d.onDelete(d.taskId)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
        </div>
      </NodeToolbar>

      <div
        className={cn(
          'rounded-lg border bg-card text-card-foreground min-w-[280px] max-w-[320px]',
          selected ? 'border-primary' : 'border-border',
          statusRing,
        )}
      >
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />

        <div className="px-3 pt-3 pb-3">
          {/* Specialist avatar row */}
          <div className="flex items-center gap-2 mb-2.5">
            <Avatar size="sm" className={cn('ring-2 shrink-0', specialistRing)}>
              <AvatarImage
                src={SPECIALIST_IMAGES[d.specialist]}
                alt={d.specialist}
              />
              <AvatarFallback className={cn('text-white text-[10px] font-bold', specialistColor)}>
                {d.specialist.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold leading-none text-foreground">
                {SPECIALIST_LABELS[d.specialist] ?? d.specialist.toUpperCase()}
              </p>
            </div>
            <span
              className={cn(
                'ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                d.status === 'done' && 'bg-green-500/15 text-green-500',
                d.status === 'blocked' && 'bg-red-400/15 text-red-400',
                d.status === 'in_progress' && 'bg-sky-400/15 text-sky-400',
                d.status === 'queued' && 'bg-zinc-500/15 text-zinc-400',
              )}
            >
              {d.status.replace('_', ' ')}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">
            {d.title}
          </p>

          {/* Description excerpt */}
          {d.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {d.description}
            </p>
          )}

        </div>
      </div>
    </>
  );
}
