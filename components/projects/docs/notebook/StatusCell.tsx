'use client';
import { Activity } from 'lucide-react';
import { useCanvasStore, emptyCanvasState } from '@/lib/canvas-live-store';
import { cn } from '@/lib/utils';
import { NotebookCell } from './NotebookCell';

const EMPTY = emptyCanvasState();

interface StatusCellProps {
  projectId: string;
}

export function StatusCell({ projectId }: StatusCellProps) {
  const ceoData = useCanvasStore((s) => (s.byProject[projectId] ?? EMPTY).ceoData);

  // Don't render until real data exists (same guard as the old HQ board)
  if (!ceoData || (ceoData.tasksQueued === 0 && ceoData.tasksRunning === 0 && ceoData.tasksDone === 0 && ceoData.goalsCount === 0)) {
    return null;
  }

  const total = ceoData.tasksQueued + ceoData.tasksRunning + ceoData.tasksDone;
  const pct = total > 0 ? Math.round((ceoData.tasksDone / total) * 100) : 0;

  const stats = [
    { label: 'Queued', value: `${ceoData.tasksQueued}`, colour: 'text-muted-foreground' },
    { label: 'Running', value: `${ceoData.tasksRunning}`, colour: 'text-sky-400' },
    { label: 'Done', value: `${ceoData.tasksDone}`, colour: 'text-green-400' },
    { label: 'Goals', value: `${ceoData.goalsCount} · ${ceoData.goalsAvgProgress.toFixed(0)}%`, colour: 'text-amber-400' },
    { label: 'PRD', value: ceoData.prdActive > 0 ? `${ceoData.prdActive}` : '—', colour: 'text-purple-400' },
    { label: 'Budget', value: `${ceoData.budgetPct.toFixed(0)}%`, colour: 'text-foreground' },
  ];

  return (
    <NotebookCell
      icon={<Activity className="size-4 text-amber-400" />}
      title="Project Status"
      subtitle={`${ceoData.tasksDone} of ${total} tasks complete`}
      accent="amber"
    >
      <div className="space-y-4">
        {/* Hero progress */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{pct}%</span>
            <span className="text-[11px] text-muted-foreground">{ceoData.tasksDone}/{total} tasks</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/40 px-2 py-2 text-center">
              <div className={cn('text-base font-bold', s.colour)}>{s.value}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </NotebookCell>
  );
}
