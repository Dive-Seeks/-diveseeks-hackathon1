'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface ToolEntry { toolName: string; domains: string[]; }

export default function ToolsPage() {
  const { data: tools = [], isLoading } = useQuery<ToolEntry[]>({
    queryKey: ['workforce', 'tools'],
    queryFn: () => api.get('/workforce/tools').then((r) => r.data.data ?? []),
  });

  if (isLoading) {
    return <div className="p-6 text-muted-foreground text-sm animate-pulse">Loading tools…</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tool Registry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          All callable tools available to specialists via <code className="text-xs">TOOL_CALL::tool_name::&#123;"arg":"val"&#125;</code>.
        </p>
      </div>
      {tools.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tools registered.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tool name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Domains</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t, i) => (
                <tr key={t.toolName} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <td className="px-4 py-2.5 font-mono text-xs">{t.toolName}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {t.domains.length === 0 ? (
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">all</span>
                      ) : (
                        t.domains.map((d) => (
                          <span key={d} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{d}</span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
