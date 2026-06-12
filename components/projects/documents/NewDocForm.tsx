'use client';
import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  specialistId: string;
  onSave: (dto: { specialistId: string; title: string; content: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function NewDocForm({ specialistId, onSave, onCancel, isSaving }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    onSave({ specialistId, title: title.trim(), content: content.trim() });
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-foreground">New Document</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        className="w-full text-[11px] bg-background border border-border/40 rounded px-2 py-1.5 mb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content (markdown supported)"
        rows={4}
        className="w-full text-[11px] bg-background border border-border/40 rounded px-2 py-1.5 mb-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none font-mono"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-[10px] px-3 py-1.5 rounded border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !title.trim() || !content.trim()}
          className={cn(
            'text-[10px] px-3 py-1.5 rounded bg-primary text-primary-foreground transition-colors',
            'disabled:opacity-50 hover:bg-primary/90 flex items-center gap-1',
          )}
        >
          {isSaving && <Loader2 className="size-2.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
