'use client';
import { useEffect, useState } from 'react';
import { FileText, ListChecks, Map as MapIcon, Sparkles, CheckCircle, AlertTriangle, FileCheck2 } from 'lucide-react';
import api from '@/lib/api';
import { useCanvasStore, emptyCanvasState } from '@/lib/canvas-live-store';
import { StatusCell } from './StatusCell';
import { DocumentCell } from './DocumentCell';
import { WorkLogCell } from './WorkLogCell';

const EMPTY = emptyCanvasState();
const EMPTY_RESULTS = {} as Record<string, { outcome: string; summary: string; docSection: string }>;

interface SpecFiles { spec: string | null; plan: string | null; tasks: string | null; }
// `team` is accepted for API symmetry with DocumentsPanel and reserved for Phase 2
// (team-specific cell variants); intentionally not consumed yet.
interface DocsNotebookProps { projectId: string; team?: 'coding' | 'general' | 'research'; }

export function DocsNotebook({ projectId }: DocsNotebookProps) {
  const [specFiles, setSpecFiles] = useState<SpecFiles>({ spec: null, plan: null, tasks: null });
  const [loading, setLoading] = useState(true);

  const slice = useCanvasStore((s) => s.byProject[projectId] ?? EMPTY);
  const ceoPlan = slice.ceoPlan;
  const agentResults = slice.agentResults ?? EMPTY_RESULTS;
  const specialists = slice.specialists ?? [];
  const completionReport = slice.completionReport;
  const reportReady = slice.reportReady ?? false;
  const reportId = slice.reportId;
  const [finalReport, setFinalReport] = useState<string | null>(null);

  useEffect(() => {
    if (!reportReady || !reportId) {
      setFinalReport(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/abigail/report-clipboard/${reportId}`)
      .then((res: any) => {
        if (cancelled) return;
        // Controller returns { data: {...} }, TransformInterceptor wraps again.
        const d = res.data?.data?.data ?? res.data?.data ?? res.data;
        if (d?.markdown) setFinalReport(d.markdown);
      })
      .catch((err) => console.error('[DocsNotebook] report fetch failed', err));
    return () => {
      cancelled = true;
    };
  }, [reportReady, reportId]);
  const completedCount = slice.completedCount ?? 0;
  const totalCount = slice.totalCount ?? 0;
  const needsReviewCount = slice.needsReviewCount ?? 0;
  const blockedCount = slice.blockedCount ?? 0;
  // Green only when every dispatched task is done and counts are populated
  const allComplete = completionReport != null && totalCount > 0 && completedCount === totalCount;

  useEffect(() => {
    setLoading(true);
    api.get(`/abigail/spec-files/${projectId}`)
      .then((res: any) => {
        const d = res.data?.data ?? res.data;
        setSpecFiles({ spec: d?.spec ?? null, plan: d?.plan ?? null, tasks: d?.tasks ?? null });
      })
      .catch((err) => console.error('[DocsNotebook] spec-files fetch failed', err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const workLog = Object.entries(agentResults);

  const amberTitle = (() => {
    const parts: string[] = [`${completedCount} of ${totalCount} tasks done`];
    if (needsReviewCount > 0) parts.push(`${needsReviewCount} need review`);
    if (blockedCount > 0) parts.push(`${blockedCount} blocked`);
    const advice =
      needsReviewCount > 0 && blockedCount > 0
        ? 'Check work log for flagged tasks, then run again to retry blocked tasks.'
        : needsReviewCount > 0
          ? 'Check work log for tasks needing review.'
          : blockedCount > 0
            ? 'Run again to retry blocked tasks.'
            : 'Run again to complete remaining tasks.';
    return `Workflow finished — ${parts.join(', ')}. ${advice}`;
  })();

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {/* 1. Status */}
      <StatusCell projectId={projectId} />

      {/* 1.5 Final compiled report — the headline deliverable when ready */}
      {finalReport && (
        <DocumentCell
          icon={<FileCheck2 className="size-4 text-emerald-400" />}
          title="Final Project Report"
          subtitle="Compiled from every specialist deliverable"
          accent="green"
          content={finalReport}
        />
      )}

      {/* 2. CEO plan */}
      {ceoPlan && (
        <DocumentCell icon={<Sparkles className="size-4 text-amber-400" />} title="Abigail CEO — Plan" accent="amber" content={ceoPlan} />
      )}

      {/* 3. Spec / Plan / Tasks */}
      {loading ? (
        <div className="animate-pulse p-2 text-sm text-muted-foreground">Loading project documents…</div>
      ) : (
        <>
          {specFiles.spec && <DocumentCell icon={<FileText className="size-4 text-sky-400" />} title="Project Specification" accent="sky" content={specFiles.spec} />}
          {specFiles.plan && <DocumentCell icon={<MapIcon className="size-4 text-purple-400" />} title="Architecture Plan" accent="purple" content={specFiles.plan} defaultOpen={false} />}
          {specFiles.tasks && <DocumentCell icon={<ListChecks className="size-4 text-green-400" />} title="Task Breakdown" accent="green" content={specFiles.tasks} defaultOpen={false} />}
        </>
      )}

      {/* 4. Work log */}
      {workLog.length > 0 && (
        <div className="space-y-2 pt-1">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Work Log</h3>
          {workLog.map(([key, r]) => {
            // Key format: "${specialist}_${position}" — extract specialist name before underscore
            const specialistId = key.includes('_') ? key.slice(0, key.lastIndexOf('_')) : key;
            return (
              <WorkLogCell
                key={key}
                specialistId={specialistId}
                specialist={specialists.find((s) => s.id === specialistId)}
                outcome={r.outcome}
                summary={r.summary}
                docSection={r.docSection}
              />
            );
          })}
        </div>
      )}

      {/* 5. Completion — green when all done, amber with split advice when partial */}
      {completionReport && (
        allComplete ? (
          <DocumentCell
            icon={<CheckCircle className="size-4 text-green-400" />}
            title="Workflow Complete"
            accent="green"
            content={completionReport}
          />
        ) : (
          <DocumentCell
            icon={<AlertTriangle className="size-4 text-amber-400" />}
            title={amberTitle}
            accent="amber"
            content={completionReport}
          />
        )
      )}
    </div>
  );
}
