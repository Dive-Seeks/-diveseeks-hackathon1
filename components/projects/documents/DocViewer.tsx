'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ScopedDocChat } from './ScopedDocChat';
import { RelatedDocs } from './RelatedDocs';
import type { DocSummary } from '@/hooks/useRelatedDocs';

type DocTab = 'content' | 'chat' | 'related';

export interface DocViewerDoc {
  id: string;
  title: string;
  content: string;
  specialistId: string;
}

interface DocViewerProps {
  doc: DocViewerDoc;
  projectId: string;
  team: 'coding' | 'general' | 'research';
  onOpenRelated: (doc: DocSummary) => void;
}

const TABS: { value: DocTab; label: string }[] = [
  { value: 'content',  label: 'Content' },
  { value: 'chat',     label: 'Chat' },
  { value: 'related',  label: 'Related' },
];

export function DocViewer({ doc, projectId, team, onOpenRelated }: DocViewerProps) {
  const [tab, setTab] = React.useState<DocTab>('content');

  // Reset to content tab when document changes
  React.useEffect(() => { setTab('content'); }, [doc.id]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border/30 shrink-0">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-4 py-2 text-[12px] font-medium border-b-2 transition-colors',
              tab === t.value
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'content' && (
          <div className="p-4">
            <MarkdownRenderer content={doc.content} />
          </div>
        )}

        {tab === 'chat' && (
          <ScopedDocChat
            projectId={projectId}
            docId={doc.id}
            specialistId={doc.specialistId}
            docTitle={doc.title}
            team={team}
          />
        )}

        {tab === 'related' && (
          <RelatedDocs
            projectId={projectId}
            docId={doc.id}
            onOpen={onOpenRelated}
          />
        )}
      </div>
    </div>
  );
}
