'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface HookEntry { point: string; hooks: string[]; }

const PLATFORM_HOOKS = ['cost-tracker', 'memory-bridge', 'hermes-observer', 'canvas-emitter', 'discipline-scorer'];

export default function HooksPage() {
  const { data: entries = [], isLoading } = useQuery<HookEntry[]>({
    queryKey: ['workforce', 'hooks'],
    queryFn: () => api.get('/workforce/hooks').then((r) => r.data.data ?? []),
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground text-sm animate-pulse">Loading hooks…</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Hook Registry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Hooks fire in priority order at each lifecycle point. Platform hooks run before tenant hooks. A failing hook never aborts dispatch.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hooks registered yet.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.point} className="rounded-xl border p-4 space-y-2">
              <div className="text-xs font-mono font-semibold text-primary">{entry.point}</div>
              <div className="space-y-1">
                {entry.hooks.map((name) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className={PLATFORM_HOOKS.includes(name) ? 'text-muted-foreground' : 'text-foreground'}>
                      {name}
                    </span>
                    {PLATFORM_HOOKS.includes(name) ? (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">
                        platform
                      </span>
                    ) : (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                        tenant
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
