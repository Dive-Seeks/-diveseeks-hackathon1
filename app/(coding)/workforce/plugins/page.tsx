'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface PluginTool { name: string; description: string; }
interface PluginFile {
  name: string;
  description: string;
  version: string;
  domains: string[];
  executionMode: string;
  tools: PluginTool[];
}
interface ActivePlugin { id: string; pluginName: string; active: boolean; }

export default function PluginsPage() {
  const qc = useQueryClient();

  const { data: available = [], isLoading } = useQuery<PluginFile[]>({
    queryKey: ['workforce', 'plugins', 'scan'],
    queryFn: () => api.get('/workforce/plugins/scan').then((r) => r.data.data ?? []),
  });

  const { data: active = [] } = useQuery<ActivePlugin[]>({
    queryKey: ['workforce', 'plugins'],
    queryFn: () => api.get('/workforce/plugins').then((r) => r.data.data ?? []),
  });

  const toggle = useMutation({
    mutationFn: async (plugin: PluginFile) => {
      const existing = active.find((a) => a.pluginName === plugin.name);
      if (existing) {
        return api.patch(`/workforce/plugins/${existing.id}`, { active: !existing.active });
      }
      return api.post('/workforce/plugins', { pluginName: plugin.name, domains: plugin.domains, active: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workforce', 'plugins'] }),
  });

  const reload = useMutation({
    mutationFn: () => api.post('/workforce/plugins/reload'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workforce', 'plugins', 'scan'] });
      qc.invalidateQueries({ queryKey: ['workforce', 'plugins'] });
    },
  });

  const isActive = (name: string) => active.some((a) => a.pluginName === name && a.active);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground text-sm animate-pulse">Loading plugins…</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Plugins</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Active plugins expose callable tools to specialists via <code className="text-xs">TOOL_CALL::</code>.
          </p>
        </div>
        <button
          onClick={() => reload.mutate()}
          disabled={reload.isPending}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
        >
          {reload.isPending ? 'Reloading…' : 'Reload plugins'}
        </button>
      </div>

      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plugins found in <code>backend/agents/plugins/</code>.</p>
      ) : (
        <div className="space-y-3">
          {available.map((plugin) => (
            <div key={plugin.name} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{plugin.name}</span>
                    <span className="text-[10px] text-muted-foreground">v{plugin.version}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded border',
                      plugin.executionMode === 'trusted'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-muted text-muted-foreground border-border/40',
                    )}>
                      {plugin.executionMode ?? 'sandbox'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plugin.description}</p>
                  <div className="flex gap-1 flex-wrap">
                    {plugin.domains.map((d) => (
                      <span key={d} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggle.mutate(plugin)}
                  disabled={toggle.isPending}
                  className={cn(
                    'shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                    isActive(plugin.name)
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  {isActive(plugin.name) ? 'Active' : 'Activate'}
                </button>
              </div>
              {plugin.tools.length > 0 && (
                <div className="border-t pt-3 space-y-1">
                  {plugin.tools.map((t) => (
                    <div key={t.name} className="flex gap-2 text-xs">
                      <code className="text-foreground/70 shrink-0">{t.name}</code>
                      <span className="text-muted-foreground">— {t.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
