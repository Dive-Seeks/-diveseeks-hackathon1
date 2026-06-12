'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const SECTIONS = [
  {
    label: 'Skills',
    href: '/workforce/skills',
    description: 'SKILL.md files injected into specialist system prompts at dispatch time.',
    badge: 'Editable',
  },
  {
    label: 'Plugins',
    href: '/workforce/plugins',
    description: 'PLUGIN.json manifests exposing callable tools to all specialists.',
    badge: 'Editable',
  },
  {
    label: 'Hooks',
    href: '/workforce/hooks',
    description: 'Lifecycle hooks registered at boot — platform and tenant.',
    badge: 'Read-only',
  },
  {
    label: 'Tools',
    href: '/workforce/tools',
    description: 'All callable tool handlers registered in the ToolRegistry.',
    badge: 'Read-only',
  },
];

export default function WorkforceHubPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workforce Hub</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Extend Abigail — add skills, plugins, and tools without touching core code.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={cn(
              'rounded-xl border p-5 hover:bg-muted/40 transition-colors flex flex-col gap-2',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{s.label}</span>
              <span className={cn(
                'text-[11px] px-2 py-0.5 rounded-full border',
                s.badge === 'Editable'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted text-muted-foreground border-border/40',
              )}>
                {s.badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
