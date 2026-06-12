import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '@/lib/api';
import { useSocket } from '@/lib/socket-context';

export interface ProjectCompletionCard {
  projectId: string;
  tenantId: string;
  status: string;
  summary: string | null;
  checklist: {
    goalsSatisfied: boolean;
    allTasksTerminal: boolean;
    noBlockedTasks: boolean;
    coordinatorReviewed: boolean;
    memoryEpisodeWritten: boolean;
  };
}

export function useProjectCompletion(projectId: string | undefined | null) {
  const socket = useSocket();

  const { data: card, isLoading, refetch } = useQuery({
    queryKey: ['project-completion', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get<{ data: ProjectCompletionCard }>(`/diveseeks/projects/${projectId}/completion-card`);
      return res.data.data;
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!projectId || !socket) return;

    // We join the project feed room to receive feed updates
    socket.emit('join_project_feed', { projectId });

    const handleUpdate = () => {
      refetch();
    };

    socket.on('project_feed_updated', handleUpdate);

    return () => {
      socket.off('project_feed_updated', handleUpdate);
      socket.emit('leave_project_feed', { projectId });
    };
  }, [projectId, socket, refetch]);

  return { card, isLoading, refetch };
}
