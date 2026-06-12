'use client';
import * as React from 'react';
import { Plus, Send, AtSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getIdentity } from '@/lib/specialist-identities';
import { SpecialistPicker } from './SpecialistPicker';
import { ModelSelector } from './ModelSelector';
import type { ModelTier } from './types';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, contextFilter: string[], modelTier: ModelTier) => void;
  contextFilter: string[];
  onContextFilterChange: (ids: string[]) => void;
  modelTier: ModelTier;
  onModelTierChange: (tier: ModelTier) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MentionInput({
  value, onChange, onSend,
  contextFilter, onContextFilterChange,
  modelTier, onModelTierChange,
  placeholder = 'Ask anything...',
  disabled,
}: MentionInputProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (v.endsWith('@')) {
      setPickerOpen(true);
      onChange(v.slice(0, -1));
    } else {
      onChange(v);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSend(value, contextFilter, modelTier);
    }
  };

  const addSpecialist = (key: string) => {
    if (!contextFilter.includes(key)) onContextFilterChange([...contextFilter, key]);
  };

  const removeSpecialist = (key: string) => {
    onContextFilterChange(contextFilter.filter(k => k !== key));
  };

  return (
    <div className="relative flex flex-col gap-0 bg-muted/40 hover:bg-muted/50 transition-all rounded-[26px] px-1.5 py-1.5 border border-border/40 shadow-xl shadow-black/10 ring-1 ring-white/5">
      {contextFilter.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pt-1.5 pb-0.5">
          {contextFilter.map(key => {
            const entry = getIdentity(key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-[11px] font-semibold text-white"
                style={{ backgroundColor: entry.colour }}
              >
                <span>{entry.monogram}</span>
                <span>{entry.displayName}</span>
                <button onClick={() => removeSpecialist(key)} className="opacity-70 hover:opacity-100 ml-0.5">
                  <X className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-1.5 px-2 py-1">
        <Button
          variant="ghost" size="icon"
          className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40"
          onClick={() => textareaRef.current?.focus()}
        >
          <Plus className="size-4.5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent dark:bg-transparent shadow-none focus-visible:ring-0 text-[15px] py-2 placeholder:text-muted-foreground/50 min-h-[40px] max-h-[200px] leading-relaxed"
        />

        <div className="flex items-center gap-1.5 shrink-0 pb-1">
          <Button
            variant="ghost" size="icon"
            onClick={() => setPickerOpen(o => !o)}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40"
            title="Scope to specialist (@)"
          >
            <AtSign className="size-4" />
          </Button>

          <ModelSelector value={modelTier} onChange={onModelTierChange} />

          <Button
            size="icon"
            disabled={!value.trim() || disabled}
            onClick={() => { if (value.trim()) onSend(value, contextFilter, modelTier); }}
            className={cn(
              'size-8 rounded-full transition-all duration-300',
              value.trim() ? 'bg-foreground text-background hover:scale-105' : 'bg-muted text-muted-foreground opacity-40',
            )}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <div className="absolute bottom-full mb-2 right-12 z-50">
          <SpecialistPicker
            selected={contextFilter}
            onSelect={addSpecialist}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
