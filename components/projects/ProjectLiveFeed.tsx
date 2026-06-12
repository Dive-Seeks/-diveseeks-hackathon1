import React from 'react';
import { useProjectFeed } from '@/hooks/useProjectFeed';
import { FeedMessage } from './FeedMessage';
import { useAuthStore } from '@/lib/auth-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';

export function ProjectLiveFeed({ projectId }: { projectId: string }) {
  const { accessToken } = useAuthStore();
  const { messages, loading } = useProjectFeed(projectId, accessToken);

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">Live Agent Feed</h3>
      </div>
      
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground animate-pulse">
            Connecting to agent feed...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground italic text-center mt-4">
            No activity yet. Set up the project vision to begin.
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg) => (
              <FeedMessage key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
