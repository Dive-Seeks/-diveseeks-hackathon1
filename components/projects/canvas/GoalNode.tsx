'use client';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const GOAL_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  complete: 'bg-green-500/20 text-green-400 border-green-500/30',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export interface GoalNodeData {
  goalId: string;
  goalTitle: string;
  goalStatus: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  taskCount: number;
  onAddTask: (goalId: string, title: string, description: string, specialist: string) => void;
}

export function GoalNode({ data, selected }: NodeProps) {
  const d = data as unknown as GoalNodeData;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', specialist: 'nova' });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    d.onAddTask(d.goalId, form.title.trim(), form.description.trim(), form.specialist);
    setForm({ title: '', description: '', specialist: 'nova' });
    setAdding(false);
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground min-w-[300px] max-w-[340px]',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      <div className="px-4 py-3 flex items-center gap-2">
        <span className="flex-1 font-semibold text-sm truncate">{d.goalTitle}</span>
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded border',
            GOAL_STATUS_COLORS[d.goalStatus ?? 'not_started'] ?? GOAL_STATUS_COLORS.not_started,
          )}
        >
          {(d.goalStatus ?? 'not_started').replace('_', ' ')}
        </span>
        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
          {d.taskCount}
        </span>
        <button
          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors nodrag"
          onClick={() => setAdding((v) => !v)}
          title="Add task"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {adding && (
        <div className="px-4 pb-3 space-y-2 nodrag">
          <input
            autoFocus
            className="w-full text-xs rounded border border-border bg-muted/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="w-full text-xs rounded border border-border bg-muted/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <select
            className="w-full text-xs rounded border border-border bg-muted/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            value={form.specialist}
            onChange={(e) => setForm((p) => ({ ...p, specialist: e.target.value }))}
          >
            {['rex','nova','kai','sage','atlas','orion','pixel','luma','felix','vex'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 hover:bg-primary/90 transition-colors"
              onClick={handleAdd}
            >
              Add
            </button>
            <button
              className="flex-1 text-xs bg-muted text-muted-foreground rounded px-2 py-1 hover:bg-muted/80 transition-colors"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
