'use client';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckSquare, Target, FileText, Briefcase } from 'lucide-react';
import { CeoNodeData, CeoSpokeData } from '../../../lib/agent-canvas.types';
import { cn } from '../../../lib/utils';
import { CeoSpeechBubble } from '../overlays/CeoSpeechBubble';

export interface CeoSpokeNodeData extends Record<string, unknown> {
  spokeKey: 'tasks' | 'goals' | 'prd' | 'budget';
  spokeData: CeoSpokeData;
}

export function CeoSpokeNode({ data }: NodeProps) {
  const d = data as unknown as CeoSpokeNodeData;
  const { spokeKey, spokeData } = d;

  const labels: Record<string, string> = {
    tasks: 'Tasks',
    goals: 'Goals',
    prd: 'PRD',
    budget: 'Budget',
  };

  const values: Record<string, string> = {
    tasks:  `${spokeData.tasksQueued}q · ${spokeData.tasksRunning}r · ${spokeData.tasksDone}d`,
    goals:  `${spokeData.goalsCount} · ${spokeData.goalsAvgProgress.toFixed(0)}%`,
    prd:    `${spokeData.prdActive} active`,
    budget: `${spokeData.budgetPct.toFixed(0)}% used`,
  };

  const colours: Record<string, string> = {
    tasks:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
    goals:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    prd:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
    budget: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  const icons: Record<string, React.ReactNode> = {
    tasks:  <CheckSquare size={14} className="text-blue-400" />,
    goals:  <Target      size={14} className="text-amber-400" />,
    prd:    <FileText    size={14} className="text-purple-400" />,
    budget: <Briefcase   size={14} className="text-emerald-400" />,
  };

  return (
    <div className={cn('rounded-lg border px-3 py-1.5 text-center min-w-[90px]', colours[spokeKey])}>
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <div className="flex items-center justify-center mb-0.5">{icons[spokeKey]}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{labels[spokeKey]}</div>
      <div className="text-[12px] font-medium mt-0.5 whitespace-nowrap">{values[spokeKey]}</div>
    </div>
  );
}

export function CeoNode({ data }: NodeProps) {
  const d = data as unknown as CeoNodeData;

  return (
    <div className="flex flex-col items-center gap-2 min-w-[200px] relative">
      {/* Speech bubble — visible when ceoPlan is set */}
      <CeoSpeechBubble text={d.speechBubble ?? ''} visible={!!d.speechBubble} />

      <div
        className="rounded-2xl border-2 border-amber-400/40 bg-amber-400/5 px-6 py-4 flex flex-col items-center gap-1"
        style={{ animation: 'ceoPulse 3s ease-in-out infinite' }}
      >
        <div className="w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center text-lg font-bold text-amber-400 mb-1">
          AB
        </div>
        <div className="text-sm font-bold text-foreground">{d.coordinatorName}</div>
        <div className="text-[11px] text-amber-400 font-medium uppercase tracking-wider">Abigail Gen 1</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-400/60" />
    </div>
  );
}
