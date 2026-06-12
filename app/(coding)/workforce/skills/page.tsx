'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface SkillFile {
  name: string;
  domain: string | null;
  description: string;
  targetRoles: string[];
  filePath: string;
}
interface ActiveSkill {
  id: string;
  skillName: string;
  domain: string | null;
  active: boolean;
}

export default function SkillsPage() {
  const qc = useQueryClient();

  const { data: available = [], isLoading: scanLoading } = useQuery<SkillFile[]>({
    queryKey: ['workforce', 'skills', 'scan'],
    queryFn: () => api.get('/workforce/skills/scan').then((r) => r.data.data ?? []),
  });

  const { data: active = [] } = useQuery<ActiveSkill[]>({
    queryKey: ['workforce', 'skills'],
    queryFn: () => api.get('/workforce/skills').then((r) => r.data.data ?? []),
  });

  const toggle = useMutation({
    mutationFn: async (skill: SkillFile) => {
      const existing = active.find((a) => a.skillName === skill.name);
      if (existing) {
        return api.patch(`/workforce/skills/${existing.id}`, { active: !existing.active });
      }
      return api.post('/workforce/skills', {
        skillName: skill.name,
        domain: skill.domain,
        targetRoles: skill.targetRoles,
        active: true,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workforce', 'skills'] }),
  });

  const isActive = (name: string) =>
    active.some((a) => a.skillName === name && a.active);

  if (scanLoading) {
    return <div className="p-6 text-muted-foreground text-sm animate-pulse">Loading skills…</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Skills</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Active skills are injected into matching specialist prompts on every dispatch. Add new skills by dropping a <code className="text-xs">SKILL.md</code> into <code className="text-xs">backend/agents/skills/</code>.
        </p>
      </div>

      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No skill files found in <code>backend/agents/skills/</code>.
        </p>
      ) : (
        <div className="space-y-3">
          {available.map((skill) => (
            <div
              key={skill.name}
              className="flex items-start justify-between rounded-xl border p-4 gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="font-medium text-sm">{skill.name}</div>
                {skill.description && (
                  <div className="text-xs text-muted-foreground">{skill.description}</div>
                )}
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {skill.domain && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
                      {skill.domain}
                    </span>
                  )}
                  {skill.targetRoles.map((r) => (
                    <span key={r} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggle.mutate(skill)}
                disabled={toggle.isPending}
                className={cn(
                  'shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                  isActive(skill.name)
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40',
                )}
              >
                {isActive(skill.name) ? 'Active' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
