'use client';

interface CoordinatorReadingOverlayProps {
  visible: boolean;
}

export function CoordinatorReadingOverlay({ visible }: CoordinatorReadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-medium mt-1">
      <span
        className="size-1.5 rounded-full bg-sky-400"
        style={{ animation: 'glowBip 0.5s ease-in-out infinite' }}
      />
      <span
        className="size-1.5 rounded-full bg-sky-400"
        style={{ animation: 'glowBip 0.5s ease-in-out 0.15s infinite' }}
      />
      <span
        className="size-1.5 rounded-full bg-sky-400"
        style={{ animation: 'glowBip 0.5s ease-in-out 0.3s infinite' }}
      />
      <span className="ml-1">Reading plan…</span>
    </div>
  );
}
