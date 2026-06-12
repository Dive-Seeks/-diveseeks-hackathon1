'use client';
import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface SpecKitDoc {
  key: string;
  label: string;
  content: string;
  createdBy?: string;
}

interface SpecKitResponse {
  docs: SpecKitDoc[];
}

interface Props {
  projectId: string;
  activeKey: string | null;
  onSelect: (key: string, content: string) => void;
  refreshKey?: number;
}

export function ProjectDocsList({ projectId, activeKey, onSelect, refreshKey }: Props) {
  const [docs, setDocs] = useState<SpecKitDoc[]>([]);

  useEffect(() => {
    api
      .get<{ data?: SpecKitResponse } & SpecKitResponse>(`/diveseeks/projects/${projectId}/speckit`)
      .then((r) => {
        const payload = r.data;
        setDocs(payload?.data?.docs ?? payload?.docs ?? []);
      })
      .catch((err) => {
        console.error('[ProjectDocsList] Failed to fetch speckit docs:', err);
      });
  }, [projectId, refreshKey]);

  return (
    <>
      <div className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Project
      </div>
      {docs.map((doc) => (
        <button
          key={doc.key}
          onClick={() => onSelect(doc.key, doc.content)}
          className={cn(
            'w-full flex items-center gap-1.5 px-3 py-2 text-left text-[11px] transition-colors',
            activeKey === doc.key
              ? 'bg-muted/40 border-l-2 border-primary text-foreground font-medium'
              : 'border-l-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
          )}
        >
          {activeKey === doc.key
            ? <ChevronDown className="size-2.5 shrink-0" />
            : <ChevronRight className="size-2.5 shrink-0" />
          }
          {doc.label}
        </button>
      ))}
    </>
  );
}
