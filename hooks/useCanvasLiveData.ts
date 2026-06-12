'use client';
import { useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useSocket } from '../lib/socket-context';
import {
  CanvasGraphInput,
  SpecialistEntry,
  AgentResultData,
} from '../lib/agent-canvas.types';
import { SPECIALIST_IDENTITIES } from '../lib/specialist-identities';
import {
  useCanvasStore,
  emptyCanvasState,
  CanvasLiveState,
} from '../lib/canvas-live-store';

export interface CanvasLiveData extends CanvasGraphInput {
  running: boolean;
  paused: boolean;
  runWorkflow: () => Promise<void>;
  pauseWorkflow: () => Promise<void>;
  resumeWorkflow: () => Promise<void>;
  syntheticMessages?: Array<{ id: string; content: string; createdAt: number }>;
  completionReport?: string;
}

function getTeamSpecialists(team: 'coding' | 'general' | 'research'): SpecialistEntry[] {
  return Object.entries(SPECIALIST_IDENTITIES)
    .filter(([, v]) => v.team === team)
    .map(([id, v]) => ({
      id,
      displayName: v.displayName,
      description: v.description,
      speciality: v.speciality,
      colour: v.colour,
      monogram: v.monogram,
      avatarPath: v.avatarPath,
      isCustom: false,
    }));
}

/**
 * Owns the project live feed subscription + initial fetches, writing everything
 * into the shared canvas store keyed by projectId. Because the store lives
 * outside the React tree, live workflow state survives tab toggles (AgentCanvas
 * unmount) and full page navigation. Call this once per page (always mounted).
 */
export function useCanvasLiveData(
  projectId: string,
  team: 'coding' | 'general' | 'research',
): CanvasLiveData {
  const socket = useSocket();
  const update = useCanvasStore((s) => s.update);
  const ensure = useCanvasStore((s) => s.ensure);
  const slice = useCanvasStore((s) => s.byProject[projectId]);
  const pulseTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Seed the project slice with the team's platform specialists before any event.
  useEffect(() => {
    if (!projectId) return;
    ensure(projectId, emptyCanvasState(getTeamSpecialists(team)));
  }, [projectId, team, ensure]);

  const onAddAgent = useCallback(async (name: string, description: string) => {
    const res = await api.post('/abigail/ensure-specialist', { domain: name });
    const agent = (res.data as any)?.data ?? (res.data as any);
    if (agent) {
      update(projectId, (prev) => ({
        ...prev,
        specialists: [
          ...prev.specialists,
          {
            id: agent.id ?? name.toLowerCase().replace(/\s+/g, '-'),
            displayName: name,
            description,
            speciality: '',
            colour: '#7C3AED',
            monogram: name.slice(0, 2).toUpperCase(),
            avatarPath: null,
            isCustom: true,
          },
        ],
      }));
    }
  }, [projectId, update]);

  const runWorkflow = useCallback(async () => {
    const cur = useCanvasStore.getState().byProject[projectId];
    if (cur?.running || cur?.paused) return;
    update(projectId, (p) => ({ ...p, running: true }));
    try {
      const res = await api.post('/abigail/canvas-run', { projectId, team });
      const data = (res.data as any)?.data ?? res.data;
      // Backend now returns { dispatched, reason?, runId?, taskCount }. When the run
      // was NOT dispatched we must clear the optimistic running flag, otherwise the
      // button wedges on "Stop Workflow" with nothing actually running.
      if (data && data.dispatched === false) {
        update(projectId, (p) => ({ ...p, running: false }));
        const reason = data.reason as string | undefined;
        toast(
          reason === 'already_running'
            ? 'A workflow is already running for this project.'
            : reason === 'no_queued_tasks'
              ? 'No queued tasks to run. Generate tasks first.'
              : reason === 'queue_unavailable'
                ? 'Workflow service is temporarily unavailable. Please try again.'
                : 'Workflow could not be started.',
        );
      }
      // On dispatched === true the ceo_speaking WS event keeps running = true.
    } catch {
      // Network / 5xx — reset so the button never wedges on "Stop".
      update(projectId, (p) => ({ ...p, running: false }));
      toast('Workflow could not be started. Please try again.');
    }
  }, [projectId, team, update]);

  const pauseWorkflow = useCallback(async () => {
    try {
      await api.post('/abigail/canvas-pause', { projectId });
      update(projectId, (p) => ({ ...p, paused: true, running: false }));
      toast('Pause requested. Completing current task...');
    } catch {
      toast('Failed to pause workflow.');
    }
  }, [projectId, update]);

  const resumeWorkflow = useCallback(async () => {
    update(projectId, (p) => ({ ...p, paused: false, running: true }));
    try {
      const res = await api.post('/abigail/canvas-resume', { projectId, team });
      const data = (res.data as any)?.data ?? res.data;
      // Backend returns { resumed, reason? }. On failure, revert: not_paused → idle,
      // anything else (already_running / no_queued_tasks / queue_unavailable) → back to paused.
      if (data && data.resumed === false) {
        update(projectId, (p) => ({ ...p, running: false, paused: data.reason !== 'not_paused' }));
        toast(
          data.reason === 'no_queued_tasks' ? 'Nothing left to run — the workflow is complete.'
            : data.reason === 'queue_unavailable' ? 'Workflow service is temporarily unavailable. Please try again.'
              : data.reason === 'already_running' ? 'A workflow is already running for this project.'
                : data.reason === 'not_paused' ? 'This workflow is not paused.'
                  : 'Could not resume the workflow.',
        );
      }
    } catch {
      update(projectId, (p) => ({ ...p, paused: true, running: false }));
      toast('Failed to resume workflow.');
    }
  }, [projectId, team, update]);


  // Encapsulates all hydration fetches so it can be called on mount AND on socket reconnect.
  const fetchState = useCallback(() => {
    if (!projectId) return;

    api.get('/agents/coordinator/scope').then((res: any) => {
      const raw = res.data?.data ?? res.data;
      const coordinator = Array.isArray(raw) ? raw[0] : raw;
      if (coordinator?.name) {
        update(projectId, (p) => ({
          ...p,
          coordinatorName: coordinator.name,
          coordinatorMonogram: coordinator.name
            .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        }));
      }
    }).catch(() => undefined);

    api.get(`/abigail/run-state/${projectId}`).then((res: any) => {
      const d = res.data?.data ?? res.data;
      const FINISHED_STATUSES = ['ready', 'waiting_for_review', 'blocked', 'cancelled'];
      if (d?.status === 'paused') {
        update(projectId, (p) => ({ ...p, paused: true, running: false }));
      } else if (d?.status === 'running' || d?.status === 'waiting_for_agents') {
        update(projectId, (p) => ({ ...p, paused: false, running: true }));
      } else if (FINISHED_STATUSES.includes(d?.status)) {
        // Project has completed a run — show the workflow_done UI so the report button is visible.
        update(projectId, (p) => ({
          ...p,
          running: false,
          paused: false,
          workflowPhase: p.workflowPhase === 'idle' || !p.workflowPhase ? 'workflow_done' : p.workflowPhase,
        }));
      } else {
        // Not running/paused — ensure running flag is cleared (handles missed workflow_done).
        update(projectId, (p) => {
          if (!p.running && !p.paused) return p;
          return { ...p, running: false, paused: false };
        });
      }
    }).catch(() => undefined);

    // Pre-load any existing report for this project (e.g. page reload after report was compiled).
    // Controller returns { data: {...} } and TransformInterceptor wraps it again → unwrap both.
    api.get(`/abigail/report-status/${projectId}`).then((res: any) => {
      const d = res.data?.data?.data ?? res.data?.data;
      if (d?.reportId && d?.status === 'ready') {
        update(projectId, (p) => ({
          ...p,
          reportReady: true,
          reportId: d.reportId as string,
          reportCompiling: false,
        }));
      } else if (d?.reportId && (d?.status === 'pending' || d?.status === 'generating')) {
        update(projectId, (p) => ({ ...p, reportCompiling: true }));
      }
    }).catch(() => undefined);

    api.get(`/diveseeks/projects/${projectId}/tasks-with-goals`).then((res: any) => {
      const goals: any[] = res.data?.data?.goals ?? res.data?.goals ?? [];
      const allTasks = goals.flatMap((g: any) => g.tasks ?? []);
      update(projectId, (p) => ({
        ...p,
        ceoData: {
          ...p.ceoData,
          tasksQueued: allTasks.filter((t: any) => t.status === 'queued').length,
          tasksRunning: allTasks.filter((t: any) => t.status === 'in_progress').length,
          tasksDone: allTasks.filter((t: any) => t.status === 'done').length,
          goalsCount: goals.length,
          goalsAvgProgress: goals.length > 0
            ? goals.reduce((s: number, g: any) => s + (g.goalStatus === 'complete' ? 100 : 0), 0) / goals.length
            : 0,
        },
      }));
    }).catch(() => undefined);

    api.get('/abigail/budget').then((res: any) => {
      const d = res.data?.data ?? res.data;
      if (typeof d?.percentUsed === 'number') {
        update(projectId, (p) => ({ ...p, ceoData: { ...p.ceoData, budgetPct: d.percentUsed } }));
      }
    }).catch(() => undefined);

    api.get('/task-prd/feature-maps', { params: { projectId } }).then((res: any) => {
      const d = res.data?.data ?? res.data;
      update(projectId, (p) => ({
        ...p,
        ceoData: { ...p.ceoData, prdActive: d?.active ?? 0, prdTotal: d?.total ?? 0 },
      }));
    }).catch(() => undefined);

    api.get('/agents/custom', { params: { team } }).then((res: any) => {
      const custom: any[] = res.data?.data ?? res.data ?? [];
      const customEntries: SpecialistEntry[] = custom.map((a: any) => ({
        id: a.id,
        displayName: a.name,
        description: a.domain ?? 'Custom agent',
        speciality: '',
        colour: '#7C3AED',
        monogram: (a.name ?? 'CA').slice(0, 2).toUpperCase(),
        avatarPath: null,
        isCustom: true,
      }));
      update(projectId, (p) => ({ ...p, specialists: [...getTeamSpecialists(team), ...customEntries] }));
    }).catch(() => undefined);
  }, [projectId, team, update]);

  // Initial REST snapshot
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Safety-net poll: while the store says a run is active, poll run-state every 30s.
  // This reconciles the UI if a workflow_done event was missed (e.g. disconnect window).
  useEffect(() => {
    const isActive = slice?.running || slice?.paused;
    if (!isActive || !projectId) {
      if (pollTimer.current !== null) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    if (pollTimer.current !== null) return; // already polling

    pollTimer.current = setInterval(() => {
      api.get(`/abigail/run-state/${projectId}`).then((res: any) => {
        const d = res.data?.data ?? res.data;
        const serverStatus = d?.status as string | undefined;
        const TERMINAL = new Set(['ready', 'idle', 'paused', 'failed', 'blocked', 'cancelled', 'waiting_for_review']);
        if (serverStatus && TERMINAL.has(serverStatus)) {
          update(projectId, (p) => ({
            ...p,
            running: false,
            paused: serverStatus === 'paused',
          }));
        }
      }).catch(() => undefined);
    }, 30_000);

    return () => {
      if (pollTimer.current !== null) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [projectId, slice?.running, slice?.paused, update]);

  // Live socket subscription
  useEffect(() => {
    if (!projectId || !socket) return;
    socket.emit('join_project_feed', { projectId });

    const rejoin = () => {
      socket.emit('join_project_feed', { projectId });
      // Reconnect is a missed-events window — refetch all state to reconcile.
      fetchState();
    };
    socket.on('connect', rejoin);

    const platformIds = new Set(getTeamSpecialists(team).map((s) => s.id));

    const handler = (payload: any) => {
      if (!payload) return;

      if (payload.type === 'agent_message' && payload.projectId === projectId) {
        const { fromAgent, interactionType, content } = payload;

        if (fromAgent === 'abigail-mind') {
          if (interactionType === 'job_started') {
            update(projectId, (p) => ({
              ...p,
              coordinatorStatus: 'running',
              coordinatorCurrentTask: typeof content === 'string'
                ? content.replace(/^Starting:\s*/i, '').slice(0, 80) : undefined,
            }));
          } else if (interactionType === 'delegation_request') {
            // Two emit formats exist: "Delegating <id> to <name>." (dispatch-engine)
            // and "Delegating to <name>: <task>" (canvas-emitter hook). Match both.
            const match = typeof content === 'string'
              ? content.match(/Delegating(?:\s+\S+)?\s+to\s+([\w-]+)(?::\s*(.+))?/)
              : null;
            const target = match?.[1];
            const task = match?.[2];
            if (target) {
              update(projectId, (p) => ({
                ...p,
                specialistStatuses: { ...p.specialistStatuses, [target]: 'running' },
                specialistCurrentTasks: task
                  ? { ...p.specialistCurrentTasks, [target]: task }
                  : p.specialistCurrentTasks,
              }));
            }
          } else if (interactionType === 'job_completed') {
            update(projectId, (p) => ({
              ...p,
              coordinatorStatus: 'idle',
              coordinatorCurrentTask: undefined,
            }));
          }
        }

        if (platformIds.has(fromAgent) && interactionType === 'job_completed') {
          const c = typeof content === 'string' ? content : '';
          const outcome = c.includes('fail') ? 'fail' : c.includes('review') ? 'needs_review' : 'pass';
          update(projectId, (p) => {
            const specialistCurrentTasks = { ...p.specialistCurrentTasks };
            delete specialistCurrentTasks[fromAgent];
            return {
              ...p,
              specialistStatuses: {
                ...p.specialistStatuses,
                [fromAgent]: outcome === 'pass' ? 'done' : outcome === 'fail' ? 'failed' : 'needs_review',
              },
              specialistCurrentTasks,
              reportOutcomes: { ...p.reportOutcomes, [fromAgent]: { outcome, at: Date.now() } },
            };
          });

          clearTimeout(pulseTimers.current[fromAgent]);
          pulseTimers.current[fromAgent] = setTimeout(() => {
            update(projectId, (p) => {
              const reportOutcomes = { ...p.reportOutcomes };
              delete reportOutcomes[fromAgent];
              return { ...p, reportOutcomes };
            });
          }, 3000);
        }
      }

      if (payload.type === 'tasks_created' && payload.projectId === projectId) {
        api.get(`/diveseeks/projects/${projectId}/tasks-with-goals`).then((res: any) => {
          const goals: any[] = res.data?.data?.goals ?? res.data?.goals ?? [];
          const allTasks = goals.flatMap((g: any) => g.tasks ?? []);
          update(projectId, (p) => ({
            ...p,
            ceoData: {
              ...p.ceoData,
              tasksQueued: allTasks.filter((t: any) => t.status === 'queued').length,
              tasksRunning: allTasks.filter((t: any) => t.status === 'in_progress').length,
              tasksDone: allTasks.filter((t: any) => t.status === 'done').length,
              goalsCount: goals.length,
            },
          }));
        }).catch(() => undefined);
      }

      if (payload.type === 'task_complete') {
        api.get('/abigail/budget').then((res: any) => {
          const d = res.data?.data ?? res.data;
          if (typeof d?.percentUsed === 'number') {
            update(projectId, (p) => ({ ...p, ceoData: { ...p.ceoData, budgetPct: d.percentUsed } }));
          }
        }).catch(() => undefined);
        api.get('/task-prd/feature-maps', { params: { projectId } }).then((res: any) => {
          const d = res.data?.data ?? res.data;
          update(projectId, (p) => ({ ...p, ceoData: { ...p.ceoData, prdActive: d?.active ?? 0, prdTotal: d?.total ?? 0 } }));
        }).catch(() => undefined);
      }

      if (payload.type === 'cycle_completed') {
        api.get(`/diveseeks/projects/${projectId}/tasks-with-goals`).then((res: any) => {
          const goals: any[] = res.data?.data?.goals ?? res.data?.goals ?? [];
          const allTasks = goals.flatMap((g: any) => g.tasks ?? []);
          update(projectId, (p) => ({
            ...p,
            ceoData: {
              ...p.ceoData,
              tasksQueued: allTasks.filter((t: any) => t.status === 'queued').length,
              tasksRunning: allTasks.filter((t: any) => t.status === 'in_progress').length,
              tasksDone: allTasks.filter((t: any) => t.status === 'done').length,
              goalsCount: goals.length,
            },
          }));
        }).catch(() => undefined);
      }

      if (payload.type === 'workflow_phase') {
        const ev = payload as { phase: string; [key: string]: any };

        if (ev.phase === 'ceo_speaking') {
          update(projectId, (p) => {
            const existing = (p.syntheticMessages ?? []).filter((m) => m.id !== 'synthetic-ceo');
            return {
              ...p,
              running: true,
              ceoPlan: ev.ceoPlan as string,
              workflowPhase: 'ceo_speaking',
              syntheticMessages: [
                ...existing,
                { id: 'synthetic-ceo', content: ev.ceoPlan as string, createdAt: Date.now() },
              ],
            };
          });
        }

        if (ev.phase === 'coordinator_reading') {
          update(projectId, (p) => ({ ...p, workflowPhase: 'coordinator_reading' }));
        }

        if (ev.phase === 'agent_assigned') {
          update(projectId, (p) => ({
            ...p,
            workflowPhase: 'agent_assigned',
            coordinatorStatus: 'running',
            coordinatorCurrentTask: `Delegating to ${ev.specialist}: ${ev.taskTitle}`,
            specialistStatuses: { ...p.specialistStatuses, [ev.specialist as string]: 'running' },
            specialistCurrentTasks: {
              ...p.specialistCurrentTasks,
              [ev.specialist as string]: ev.taskTitle as string,
            },
            // Optimistic counter: task moved from queued → running
            ceoData: {
              ...p.ceoData,
              tasksQueued: Math.max(0, p.ceoData.tasksQueued - 1),
              tasksRunning: p.ceoData.tasksRunning + 1,
            },
          }));
        }

        if (ev.phase === 'agent_complete') {
          const specialist = ev.specialist as string;
          // Key by position so multiple tasks assigned to the same specialist
          // all appear in the Work Log (not overwritten by the last one).
          const resultKey = `${specialist}_${ev.position as number}`;
          const result: AgentResultData = {
            outcome: ev.outcome as 'done' | 'needs_review' | 'blocked',
            summary: ev.summary as string,
            docSection: ev.docSection as string,
            executorBackend: ev.executorBackend as string | undefined,
          };
          const outcomeLabel =
            result.outcome === 'done' ? 'DONE' :
            result.outcome === 'needs_review' ? 'NEEDS REVIEW' : 'BLOCKED';
          const syntheticId = `synthetic-${resultKey}`;
          update(projectId, (p) => {
            const specialistCurrentTasks = { ...p.specialistCurrentTasks };
            delete specialistCurrentTasks[specialist];
            const existing = (p.syntheticMessages ?? []).filter((m) => m.id !== syntheticId);
            return {
              ...p,
              specialistStatuses: {
                ...p.specialistStatuses,
                [specialist]: result.outcome === 'done' ? 'done' : result.outcome === 'needs_review' ? 'needs_review' : 'failed',
              },
              specialistCurrentTasks,
              agentResults: { ...(p.agentResults ?? {}), [resultKey]: result },
              // Optimistic counter: task moved from running → done/blocked
              ceoData: {
                ...p.ceoData,
                tasksRunning: Math.max(0, p.ceoData.tasksRunning - 1),
                tasksDone: result.outcome === 'done'
                  ? p.ceoData.tasksDone + 1
                  : p.ceoData.tasksDone,
              },
              syntheticMessages: [
                ...existing,
                {
                  id: syntheticId,
                  content: `**${specialist}** [${outcomeLabel}]: ${result.summary}`,
                  createdAt: Date.now(),
                },
              ],
            };
          });
        }

        if (ev.phase === 'workflow_done') {
          update(projectId, (p) => ({
            ...p,
            running: false,
            paused: false,
            workflowPhase: 'workflow_done',
            coordinatorStatus: 'idle',
            coordinatorCurrentTask: undefined,
            completionReport: ev.reportSection as string,
            completedCount: (ev.completedCount as number) ?? 0,
            needsReviewCount: (ev.needsReviewCount as number) ?? 0,
            blockedCount: (ev.blockedCount as number) ?? 0,
            totalCount: (ev.totalCount as number) ?? 0,
          }));
        }

        if (ev.phase === 'report_ready') {
          update(projectId, (p) => ({
            ...p,
            reportCompiling: false,
            reportReady: true,
            reportId: ev.reportId as string,
          }));
        }

        if (ev.phase === 'report_failed') {
          update(projectId, (p) => ({ ...p, reportCompiling: false }));
        }

        if (ev.phase === 'workflow_paused') {
          update(projectId, (p) => ({
            ...p,
            running: false,
            paused: true,
            workflowPhase: 'workflow_paused',
            coordinatorStatus: 'idle',
            coordinatorCurrentTask: 'Workflow paused.',
          }));
        }

        if (ev.phase === 'workflow_resumed' || ev.phase === 'workflow_resumed_after_interrupt') {
          update(projectId, (p) => ({
            ...p,
            running: true,
            paused: false,
            workflowPhase: ev.phase as CanvasLiveState['workflowPhase'],
            coordinatorStatus: 'running',
            coordinatorCurrentTask: 'Resuming workflow...',
          }));
        }
      }
    };

    socket.on('project_feed_updated', handler);
    const timers = pulseTimers.current;
    return () => {
      socket.off('connect', rejoin);
      socket.off('project_feed_updated', handler);
      socket.emit('leave_project_feed', { projectId });
      Object.values(timers).forEach(clearTimeout);
    };
  }, [projectId, team, socket, update, fetchState]);

  const fallback = useMemo(() => emptyCanvasState(getTeamSpecialists(team)), [team]);
  const state: CanvasLiveState = slice ?? fallback;

  return {
    team,
    coordinatorName: state.coordinatorName,
    coordinatorMonogram: state.coordinatorMonogram,
    coordinatorStatus: state.coordinatorStatus,
    coordinatorCurrentTask: state.coordinatorCurrentTask,
    specialists: state.specialists,
    ceoData: state.ceoData,
    specialistStatuses: state.specialistStatuses,
    specialistCurrentTasks: state.specialistCurrentTasks,
    reportOutcomes: state.reportOutcomes,
    onAddAgent,
    running: state.running,
    paused: state.paused,
    runWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    // Phase additions
    workflowPhase: state.workflowPhase,
    ceoPlan: state.ceoPlan,
    agentResults: state.agentResults,
    syntheticMessages: state.syntheticMessages,
    completionReport: state.completionReport,
  };
}
