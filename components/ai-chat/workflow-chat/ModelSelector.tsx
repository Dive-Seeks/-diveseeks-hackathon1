'use client';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelTier } from './types';

const TIERS: { value: ModelTier; label: string; description: string }[] = [
  { value: 'fast',     label: 'Fast',     description: 'Quick answers' },
  { value: 'balanced', label: 'Balanced', description: 'Default quality' },
  { value: 'deep',     label: 'Deep',     description: 'Best for planning' },
];

interface ModelSelectorProps {
  value: ModelTier;
  onChange: (tier: ModelTier) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = TIERS.find(t => t.value === value) ?? TIERS[1];

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/40 bg-muted/30 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {current.label}
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 z-50 min-w-[140px] rounded-lg border border-border/40 bg-card shadow-lg overflow-hidden">
          {TIERS.map(tier => (
            <button
              key={tier.value}
              onClick={() => { onChange(tier.value); setOpen(false); }}
              className={cn(
                'w-full flex flex-col items-start px-3 py-2 text-left hover:bg-muted/40 transition-colors',
                value === tier.value && 'bg-muted/60',
              )}
            >
              <span className="text-[12px] font-medium text-foreground">{tier.label}</span>
              <span className="text-[10px] text-muted-foreground">{tier.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
