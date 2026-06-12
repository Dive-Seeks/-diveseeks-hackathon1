'use client';
import * as React from 'react';
import { MarkdownRenderer } from '@/components/projects/documents/MarkdownRenderer';
import { NotebookCell, CellAccent } from './NotebookCell';

interface DocumentCellProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: CellAccent;
  content: string;
  defaultOpen?: boolean;
}

export function DocumentCell({ icon, title, subtitle, accent = 'neutral', content, defaultOpen = true }: DocumentCellProps) {
  return (
    <NotebookCell icon={icon} title={title} subtitle={subtitle} accent={accent} defaultOpen={defaultOpen}>
      <MarkdownRenderer content={content} />
    </NotebookCell>
  );
}
