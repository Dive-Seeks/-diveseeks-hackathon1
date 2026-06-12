'use client';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddAgentNodeData } from '../../../lib/agent-canvas.types';
import { cn } from '../../../lib/utils';

export function AddAgentNode({ data }: NodeProps) {
  const d = data as unknown as AddAgentNodeData;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await d.onAddAgent(name.trim(), description.trim());
      setName('');
      setDescription('');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAdd();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setName('');
      setDescription('');
    }
  };

  if (!open) {
    return (
      <div
        className="w-44 h-28 rounded-xl border-2 border-dashed border-border bg-card/60 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all nodrag"
        onClick={() => setOpen(true)}
      >
        <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
          <Plus className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">Add Agent</span>
      </div>
    );
  }

  return (
    <div className="w-52 rounded-xl border-2 border-primary/40 bg-card shadow-lg px-3 py-3 space-y-2 nodrag">
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <input
        autoFocus
        className="w-full text-[12px] rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
        placeholder="Agent name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <input
        className="w-full text-[12px] rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
        placeholder="What does this agent do?"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <div className="flex gap-2">
        <button
          className={cn(
            'flex-1 text-[11px] rounded-lg py-1.5 font-medium transition-colors',
            name.trim() && !loading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
          onClick={handleAdd}
          disabled={!name.trim() || loading}
        >
          {loading ? '…' : 'Add'}
        </button>
        <button
          className="flex-1 text-[11px] rounded-lg py-1.5 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          onClick={() => { setOpen(false); setName(''); setDescription(''); }}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
