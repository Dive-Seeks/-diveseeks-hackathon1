'use client';
import React from 'react';
import { Loader2, Palette } from 'lucide-react';
import api from '@/lib/api';

const OPEN_DESIGN_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OPEN_DESIGN_URL) ||
  'http://localhost:17573';

interface DesignPanelProps {
  reportId?: string | null;
}

export function DesignPanel({ reportId }: DesignPanelProps) {
  const [iframeUrl, setIframeUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    api
      .post(`/abigail/design-project/${reportId}`)
      .then((res) => {
        const odProjectId: string | null = res.data?.data?.odProjectId ?? null;
        setIframeUrl(odProjectId ? `${OPEN_DESIGN_URL}/${odProjectId}` : OPEN_DESIGN_URL);
      })
      .catch(() => setIframeUrl(OPEN_DESIGN_URL))
      .finally(() => setLoading(false));
  }, [reportId]);

  if (!reportId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Palette className="size-10 opacity-20" />
          <p className="text-sm">Run the workflow and compile a report to design the output.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <iframe
      src={iframeUrl ?? OPEN_DESIGN_URL}
      className="w-full h-full border-0"
      title="Design Studio"
      allow="clipboard-read; clipboard-write"
    />
  );
}
