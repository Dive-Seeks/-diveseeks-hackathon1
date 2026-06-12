'use client';
import { CitationPill } from './CitationPill';
import type { Citation } from './types';

interface CitationRendererProps {
  content: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}

export function CitationRenderer({ content, citations, onCitationClick }: CitationRendererProps) {
  const readableContent = normalizeAssistantMarkup(content);
  const parts = readableContent.split(/(\[CITE:[^\]]+\])/g);

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/\[CITE:([^\]]+)\]/);
        if (match) {
          const cit = citations.find(c => c.id === match[1]);
          return cit ? <CitationPill key={i} citation={cit} onClick={onCitationClick} /> : null;
        }
        return part ? <span key={i}>{part}</span> : null;
      })}
    </div>
  );
}

function normalizeAssistantMarkup(content: string): string {
  if (!/<[A-Za-z][\s\S]*?>/.test(content)) return content;

  return content
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<(p|div|li|h[1-6])\b[^>]*>/gi, '')
    .replace(/<\/?(span|strong|em|b|i|a|Link)\b[^>]*>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
