'use client';
import Image from 'next/image';
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { MarkdownRenderer } from '../../projects/documents/MarkdownRenderer';

export interface BrainMemoryItem {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface BrainRegionDefinition {
  id: string;
  name: string;
  description: string;
  detail: string;
  accentClass: string;
  borderClass: string;
  edgeColor: string;
}

export interface BrainCoreNodeData extends Record<string, unknown> {
  projectName?: string;
  isLoading: boolean;
  totalItems: number;
  active: boolean;
}

export interface BrainRegionNodeData extends Record<string, unknown> {
  region: BrainRegionDefinition;
  itemCount: number;
  isSelected: boolean;
  handleSide: 'left' | 'right' | 'top';
  onSelect: (regionId: string) => void;
}

export interface BrainDetailNodeData extends Record<string, unknown> {
  region: BrainRegionDefinition | null;
  items: BrainMemoryItem[];
  isLoading: boolean;
}

export interface FinalReportNodeData extends Record<string, unknown> {
  markdown: string;
  generatedLabel?: string;
}

export function BrainCoreNode({ data }: NodeProps) {
  const d = data as unknown as BrainCoreNodeData;
  return (
    <div
      className={cn(
        'nodrag relative w-[240px] rounded-3xl border-2 bg-card/95 p-4 text-center shadow-2xl backdrop-blur transition-all',
        d.active ? 'border-sky-400/70' : 'border-border/70',
      )}
      style={d.active ? { animation: 'glowBip 2.2s ease-in-out infinite' } : undefined}
    >
      <Handle type="target" position={Position.Top} className="size-2 bg-sky-400" />
      <Handle id="l" type="source" position={Position.Left} className="size-2 bg-sky-400/70" />
      <Handle id="r" type="source" position={Position.Right} className="size-2 bg-sky-400/70" />
      <Handle id="b" type="source" position={Position.Bottom} className="size-2 bg-sky-400/70" />

      <div className="relative mx-auto flex size-28 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-sky-400/50"
          style={{ animation: 'radarPing 2.4s ease-out infinite' }}
        />
        <span
          className="absolute inset-2 rounded-full border border-sky-300/30"
          style={{ animation: 'radarPing 2.4s ease-out infinite', animationDelay: '0.8s' }}
        />
        <Image
          src="/brian-svg/2099158.svg"
          alt="Abigail brain"
          width={96}
          height={96}
          className="relative z-10 size-24 object-contain opacity-90 brightness-0 invert"
        />
      </div>

      <div className="mt-2 text-sm font-semibold text-foreground">Abigail Brain</div>
      <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
        Memory, knowledge, learning &amp; decisions — human-readable.
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-300">
        {d.isLoading ? (
          <>
            <Loader2 className="size-3 animate-spin" /> Reading memory…
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
            {d.totalItems} live memor{d.totalItems === 1 ? 'y' : 'ies'}
          </>
        )}
      </div>
    </div>
  );
}

const HANDLE_POSITION: Record<'left' | 'right' | 'top', Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
};

export function BrainRegionNode({ data }: NodeProps) {
  const d = data as unknown as BrainRegionNodeData;
  const { region, itemCount, isSelected, handleSide, onSelect } = d;
  return (
    <button
      type="button"
      onClick={() => onSelect(region.id)}
      className={cn(
        'nodrag w-[200px] rounded-2xl border-2 bg-card/95 px-3.5 py-3 text-left shadow-lg backdrop-blur transition-all hover:scale-[1.03]',
        isSelected ? `${region.borderClass} ${region.accentClass}` : 'border-border/60',
      )}
      style={isSelected ? { boxShadow: `0 0 18px ${region.edgeColor}40` } : undefined}
    >
      <Handle type="target" position={HANDLE_POSITION[handleSide]} className="size-1.5" style={{ background: region.edgeColor }} />
      <Handle id="out" type="source" position={handleSide === 'left' ? Position.Right : Position.Left} className="size-1.5 opacity-0" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-foreground">{region.name}</span>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium',
            itemCount > 0 ? region.accentClass : 'bg-muted text-muted-foreground/60',
          )}
        >
          {itemCount > 0 && (
            <span className="size-1 rounded-full animate-pulse" style={{ background: region.edgeColor }} />
          )}
          {itemCount}
        </span>
      </div>
      <div className="mt-1 text-[10px] leading-tight text-muted-foreground">{region.description}</div>
    </button>
  );
}

export function BrainDetailNode({ data }: NodeProps) {
  const d = data as unknown as BrainDetailNodeData;
  const region = d.region;
  return (
    <div className="nodrag w-[380px] rounded-2xl border border-border/70 bg-card/95 p-4 shadow-2xl backdrop-blur">
      <Handle type="target" position={Position.Left} className="size-2" style={{ background: region?.edgeColor ?? '#38bdf8' }} />
      {region ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{region.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{region.detail}</div>
            </div>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px]', region.accentClass)}>
              {d.items.length} item{d.items.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="nowheel mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {d.isLoading ? (
              <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-3.5 animate-spin" /> Loading…
              </div>
            ) : d.items.length > 0 ? (
              d.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-background/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-foreground" title={item.title}>
                        {item.title}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.detail}</div>
                    </div>
                    {item.meta ? (
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px]',
                          item.tone === 'danger' && 'bg-rose-500/10 text-rose-300',
                          item.tone === 'warning' && 'bg-amber-500/10 text-amber-300',
                          item.tone === 'success' && 'bg-emerald-500/10 text-emerald-300',
                          (!item.tone || item.tone === 'neutral') && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4">
                <div className="text-xs font-medium text-foreground">Nothing stored here yet</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  This region fills up as the workflow runs and Abigail learns.
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function FinalReportNode({ data }: NodeProps) {
  const d = data as unknown as FinalReportNodeData;
  return (
    <div
      className="nodrag w-[460px] rounded-2xl border-2 border-emerald-400/50 bg-card/95 p-4 shadow-2xl backdrop-blur"
      style={{ boxShadow: '0 0 24px rgba(52,211,153,0.18)' }}
    >
      <Handle type="target" position={Position.Left} className="size-2 bg-emerald-400" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/10">
            <FileText className="size-3.5 text-emerald-300" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Final Project Report</div>
            {d.generatedLabel ? (
              <div className="text-[10px] text-muted-foreground">{d.generatedLabel}</div>
            ) : null}
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> ready
        </span>
      </div>
      <div className="nowheel mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-border/60 bg-background/80 p-3 text-[12px]">
        <MarkdownRenderer content={d.markdown} />
      </div>
    </div>
  );
}
