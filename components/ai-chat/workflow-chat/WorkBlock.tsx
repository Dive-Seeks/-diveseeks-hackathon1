'use client';
import * as React from 'react';
import { getIdentity } from '@/lib/specialist-identities';
import { WorkDetail } from './WorkDetail';
import { RoutingActions } from './RoutingActions';
import type { WorkBlockState } from './types';

interface WorkBlockProps {
  workBlock: WorkBlockState;
  onToggleExpanded: () => void;
}

export function WorkBlock({ workBlock, onToggleExpanded }: WorkBlockProps) {
  const coordinator = getIdentity('abigail-mind');

  return (
    <div className="rounded-b-2xl border border-t-0 border-border/40 bg-muted/30 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">
          <div
            className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: coordinator.colour }}
          >
            {coordinator.monogram}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
            {coordinator.displayName}
          </span>

          <WorkDetail
            steps={workBlock.agentSteps}
            expanded={workBlock.expanded}
            onToggle={onToggleExpanded}
            status={workBlock.status}
          />

          {workBlock.routing &&
            (workBlock.routing === 'complex' || workBlock.routing === 'specialist') && (
              <RoutingActions
                routing={workBlock.routing}
                specialistName={workBlock.specialistName}
                specialistRoute={workBlock.specialistRoute}
              />
            )}
        </div>
      </div>
    </div>
  );
}
