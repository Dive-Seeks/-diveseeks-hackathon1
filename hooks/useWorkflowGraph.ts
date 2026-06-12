'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { socket } from '@/lib/socket';
import { GoalWithTasks } from '@/types/project-feed';

export function useWorkflowGraph(projectId: string) {
  const [goals, setGoals] = useState<GoalWithTasks[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(() => {
    if (!projectId) return;
    api
      .get<{ data: { goals: GoalWithTasks[] } }>(
        `/diveseeks/projects/${projectId}/tasks-with-goals`,
      )
      .then((res) => {
        const payload = res.data as any;
        setGoals(payload?.data?.goals ?? payload?.goals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  // Initial fetch
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Refetch when new tasks are created (tasks_created WS event)
  useEffect(() => {
    if (!projectId) return;
    const handler = (payload: { projectId: string }) => {
      if (payload.projectId === projectId) fetchGoals();
    };
    socket.on('tasks_created', handler);
    return () => { socket.off('tasks_created', handler); };
  }, [projectId, fetchGoals]);

  // Update individual task status in-place from feed messages
  useEffect(() => {
    if (!projectId) return;
    const handler = (msg: { type: string; refId?: string; outcome?: string; specialist?: string }) => {
      if (msg.type !== 'task_complete') return;
      const newStatus = msg.outcome === 'pass' ? 'done' : msg.outcome === 'fail' ? 'blocked' : undefined;
      if (!newStatus || !msg.refId) return;
      setGoals((prev) =>
        prev.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) =>
            t.sessionId === msg.refId ? { ...t, status: newStatus } : t,
          ),
        })),
      );
    };
    socket.on('project_feed_updated', handler);
    return () => { socket.off('project_feed_updated', handler); };
  }, [projectId]);

  const deleteTask = useCallback(
    async (taskId: string) => {
      await api.delete(`/diveseeks/projects/${projectId}/tasks/${taskId}`);
      setGoals((prev) =>
        prev.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) })),
      );
    },
    [projectId],
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, status: 'done' | 'blocked') => {
      await api.patch(
        `/diveseeks/projects/${projectId}/tasks/${taskId}/status`,
        { status },
      );
      setGoals((prev) =>
        prev.map((g) => ({
          ...g,
          tasks: g.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
        })),
      );
    },
    [projectId],
  );

  const addTask = useCallback(
    async (goalId: string, title: string, description: string, specialist: string) => {
      const res = await api.post<{ data: { task: import('@/types/project-feed').CanvasTask } }>(
        `/diveseeks/projects/${projectId}/tasks`,
        { goalId, title, description, specialist },
      );
      const newTask = (res.data as any)?.data?.task ?? (res.data as any)?.task;
      if (!newTask) return;
      setGoals((prev) =>
        prev.map((g) =>
          g.goalId === goalId ? { ...g, tasks: [...g.tasks, newTask] } : g,
        ),
      );
    },
    [projectId],
  );

  return { goals, loading, refetch: fetchGoals, deleteTask, updateTaskStatus, addTask };
}
