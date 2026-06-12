'use client';
import { Play, Square, Loader2, FileText, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/lib/canvas-live-store';
import api from '@/lib/api';

interface WorkflowRunButtonProps {
  projectId: string;
  team: 'coding' | 'general' | 'research';
  onRun: () => Promise<void>;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  onDesign?: () => void;
}

const OPEN_DESIGN_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OPEN_DESIGN_URL) ||
  'http://localhost:17573';

export function WorkflowRunButton({ projectId, onRun, onPause, onResume, onDesign }: WorkflowRunButtonProps) {
  const running = useCanvasStore((s) => s.byProject[projectId]?.running ?? false);
  const paused = useCanvasStore((s) => s.byProject[projectId]?.paused ?? false);
  const workflowPhase = useCanvasStore((s) => s.byProject[projectId]?.workflowPhase ?? 'idle');
  const reportCompiling = useCanvasStore((s) => s.byProject[projectId]?.reportCompiling ?? false);
  const reportReady = useCanvasStore((s) => s.byProject[projectId]?.reportReady ?? false);
  const reportId = useCanvasStore((s) => s.byProject[projectId]?.reportId);
  const update = useCanvasStore((s) => s.update);

  async function handleStop() {
    if (typeof window !== 'undefined') {
      (window as any).__canvasStopping = { ...((window as any).__canvasStopping ?? {}), [projectId]: true };
    }
    try {
      await api.post('/abigail/canvas-stop', { projectId });
      update(projectId, (p) => ({ ...p, running: false, paused: false }));
    } catch {
      // workflow_done event will reset state
    } finally {
      if (typeof window !== 'undefined') {
        (window as any).__canvasStopping = { ...((window as any).__canvasStopping ?? {}), [projectId]: false };
      }
    }
  }

  async function handleCompileReport() {
    update(projectId, (p) => ({ ...p, reportCompiling: true }));
    try {
      await api.post(`/abigail/compile-report/${projectId}`);
    } catch {
      update(projectId, (p) => ({ ...p, reportCompiling: false }));
    }
  }

  async function handleDesignOutput() {
    if (!reportId) return;
    let odProjectId: string | null = null;
    try {
      const res = await api.post(`/abigail/design-project/${reportId}`);
      odProjectId = res.data?.data?.odProjectId ?? null;
    } catch {
      // fall back to root OD URL if project creation fails
    }
    const url = odProjectId ? `${OPEN_DESIGN_URL}/${odProjectId}` : OPEN_DESIGN_URL;
    window.open(url, '_blank');
  }

  if (running) {
    return (
      <button
        onClick={onPause}
        className={cn(
          'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
          'border border-amber-400/50 bg-amber-400/10 text-amber-400',
          'hover:bg-amber-400/20 active:scale-95',
          'shadow-[0_0_12px_rgba(251,191,36,0.3)]',
        )}
        style={{ animation: 'ceoPulse 2s ease-in-out infinite' }}
      >
        <Square className="h-3.5 w-3.5 fill-current" />
        Pause Workflow
      </button>
    );
  }

  if (paused) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onResume}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            'bg-zinc-900 text-white border border-zinc-700',
            'hover:bg-zinc-700 active:scale-95',
          )}
        >
          <Play className="h-3.5 w-3.5" />
          Resume Workflow
        </button>
        <button
          onClick={handleStop}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            'border border-red-500/50 bg-red-500/10 text-red-500',
            'hover:bg-red-500/20 active:scale-95',
          )}
        >
          End Run
        </button>
      </div>
    );
  }

  if (workflowPhase === 'workflow_done') {
    if (reportReady && reportId) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={handleDesignOutput}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              'border border-[#FF4D00]/60 bg-[#FF4D00]/10 text-[#FF4D00]',
              'hover:bg-[#FF4D00]/20 active:scale-95',
              'shadow-[0_0_12px_rgba(255,77,0,0.25)]',
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            Design the Output
          </button>
          <button
            onClick={onRun}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              'bg-zinc-900 text-white border border-zinc-700',
              'hover:bg-zinc-700 active:scale-95',
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Run Again
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleCompileReport}
          disabled={reportCompiling}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            'border border-zinc-500/60 bg-zinc-800 text-zinc-200',
            'hover:bg-zinc-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {reportCompiling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          {reportCompiling ? 'Compiling...' : 'Compile Final Report'}
        </button>
        <button
          onClick={onRun}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
            'bg-zinc-900 text-white border border-zinc-700',
            'hover:bg-zinc-700 active:scale-95',
          )}
        >
          <Play className="h-3.5 w-3.5" />
          Run Again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onRun}
      className={cn(
        'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
        'bg-zinc-900 text-white border border-zinc-700',
        'hover:bg-zinc-700 active:scale-95',
      )}
    >
      <Play className="h-3.5 w-3.5" />
      Run Workflow
    </button>
  );
}
