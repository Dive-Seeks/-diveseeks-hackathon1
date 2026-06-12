import React from 'react';
import { ProjectFeedMessage } from '@/types/project-feed';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, XCircle, HelpCircle, Activity } from 'lucide-react';

export function FeedMessage({ message }: { message: ProjectFeedMessage }) {
  const isSuccess = message.outcome === 'success' || message.outcome === 'pass';
  const isFail = message.outcome === 'fail';
  const isReview = message.outcome === 'needs_review';

  return (
    <div className="flex items-start gap-3 p-3 text-sm border-b border-border/50 bg-background/50 hover:bg-muted/20 transition-colors">
      <div className="mt-0.5">
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {isFail && <XCircle className="w-4 h-4 text-red-500" />}
        {isReview && <HelpCircle className="w-4 h-4 text-amber-500" />}
        {!isSuccess && !isFail && !isReview && <Activity className="w-4 h-4 text-blue-500" />}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground/90">
            {message.specialist || 'System'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : 'just now'}
          </span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {message.content}
        </p>
      </div>
    </div>
  );
}
