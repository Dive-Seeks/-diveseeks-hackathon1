'use client';
import { cn } from '../../../lib/utils';

interface CeoSpeechBubbleProps {
  text: string;
  visible: boolean;
}

export function CeoSpeechBubble({ text, visible }: CeoSpeechBubbleProps) {
  return (
    <div
      className={cn(
        'absolute -top-24 left-1/2 -translate-x-1/2 w-64 z-20',
        'rounded-xl border border-amber-400/40 bg-zinc-900/95 px-4 py-3',
        'text-[12px] text-amber-100 leading-relaxed shadow-lg',
        'transition-all duration-500',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none',
      )}
    >
      {/* Arrow pointing down to CEO node */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-amber-400/40 bg-zinc-900/95" />
      <span className="text-amber-400 font-semibold text-[11px] uppercase tracking-wide block mb-1">Abigail CEO</span>
      {text}
    </div>
  );
}
