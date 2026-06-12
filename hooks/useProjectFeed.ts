import { useEffect, useState } from 'react';
import { ProjectFeedMessage } from '../types/project-feed';
import { useSocket } from '../lib/socket-context';
import api from '../lib/api';

export function useProjectFeed(projectId: string, token: string | null) {
  const [messages, setMessages] = useState<ProjectFeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  // 1. Fetch historical from REST
  useEffect(() => {
    if (!projectId || !token) return;

    api
      .get<{ data: ProjectFeedMessage[] }>(`/project-feed/${projectId}`)
      .then((res) => {
        const payload = res.data as any;
        setMessages(payload?.data ?? payload ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId, token]);

  // 2. Subscribe to real-time via Socket.io
  useEffect(() => {
    if (!projectId || !socket) return;

    socket.emit('join_project_feed', { projectId });

    const handleUpdate = (newMsg: ProjectFeedMessage) => {
      // Ignore control signals (tasks_created etc.) — only append real feed messages
      if (!newMsg.id) return;
      setMessages(prev => [newMsg, ...prev]);
    };

    socket.on('project_feed_updated', handleUpdate);

    return () => {
      socket.off('project_feed_updated', handleUpdate);
      socket.emit('leave_project_feed', { projectId });
    };
  }, [projectId, socket]);

  return { messages, loading };
}
