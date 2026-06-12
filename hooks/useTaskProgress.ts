import { useEffect, useState } from 'react';
import { TaskProgressEvent } from '../types/project-feed';
import { socket } from '../lib/socket';

export function useTaskProgress(sessionId?: string | null) {
  const [progress, setProgress] = useState<TaskProgressEvent | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const handleProgress = (event: TaskProgressEvent) => {
      if (event.sessionId === sessionId) {
        setProgress(event);
      }
    };

    socket.on('task_progress', handleProgress);

    return () => {
      socket.off('task_progress', handleProgress);
    };
  }, [sessionId]);

  return progress;
}
