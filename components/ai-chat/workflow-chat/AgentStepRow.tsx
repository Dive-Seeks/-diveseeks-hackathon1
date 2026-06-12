'use client';
import * as React from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { getIdentity } from '@/lib/specialist-identities';
import type { AgentStep } from './types';

interface AgentStepRowProps {
  step: AgentStep;
}

export function AgentStepRow({ step }: AgentStepRowProps) {
  const identity = getIdentity(step.agentKey);

  return (
    <div className="flex items-center gap-2 py-1 min-h-[32px]">
      <div className="shrink-0">
        {identity.avatarPath ? (
          <img
            src={identity.avatarPath}
            alt={identity.displayName}
            className="size-4 rounded-full object-cover"
          />
        ) : (
          <div
            className="size-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{ backgroundColor: identity.colour }}
          >
            {identity.monogram.slice(0, 1)}
          </div>
        )}
      </div>

      <span className="text-xs font-medium text-foreground shrink-0 w-24 truncate">
        {identity.displayName}
      </span>

      <span className="text-xs text-muted-foreground flex-1 truncate">{step.summary}</span>

      <div className="shrink-0">
        {step.status === 'done' && <CheckCircle2 className="size-3.5 text-emerald-500" />}
        {step.status === 'pending' && <Loader2 className="size-3.5 text-amber-500 animate-spin" />}
        {step.status === 'error' && <XCircle className="size-3.5 text-destructive" />}
      </div>
    </div>
  );
}
