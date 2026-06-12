'use client';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Full GFM markdown (tables, task lists, links, blockquotes, nested lists) styled
// with @tailwindcss/typography. Replaces the previous hand-rolled 6-pattern parser;
// props are unchanged so every existing consumer upgrades for free.
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-p:text-foreground/90 prose-li:text-foreground/90',
        'prose-strong:text-foreground prose-a:text-sky-400',
        'prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-[""] prose-code:after:content-[""]',
        'prose-pre:bg-muted prose-pre:text-foreground/80',
        'prose-table:text-foreground/90 prose-th:text-foreground',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
