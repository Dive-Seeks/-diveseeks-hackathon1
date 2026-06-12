'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

interface AgentSession {
  id: string;
  domain: string;
  status: string;
  pendingApproval: object | null;
  currentStep: number;
  createdAt: string;
}

export default function DomainSessionPage({ params }: { params: { domain: string } }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    api.get(`/sessions/${sessionId}`).then(r => setSession(r.data.data)).finally(() => setLoading(false));
  }, [sessionId]);

  async function approve() {
    if (!sessionId) return;
    setActioning(true);
    const r = await api.post(`/sessions/${sessionId}/approve`);
    setSession(r.data.data);
    setActioning(false);
  }

  async function reject() {
    const reason = window.prompt('Reason for rejection?');
    if (!reason || !sessionId) return;
    setActioning(true);
    const r = await api.post(`/sessions/${sessionId}/reject`, { reason });
    setSession(r.data.data);
    setActioning(false);
  }

  if (loading) return <div className="p-8 text-muted-foreground">Loading session...</div>;
  if (!session) return <div className="p-8 text-muted-foreground">Session not found.</div>;

  const statusColour: Record<string, string> = {
    running: 'text-muted-foreground', waiting_approval: 'text-muted-foreground',
    approved: 'text-foreground', rejected: 'text-destructive',
    stalled: 'text-muted-foreground', completed: 'text-foreground',
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1 capitalize">{session.domain} Session</h1>
      <p className={`text-sm font-medium mb-6 ${statusColour[session.status] ?? 'text-muted-foreground'}`}>
        Status: {session.status.replace(/_/g, ' ')}
      </p>

      {session.pendingApproval && (
        <div className="border rounded-xl p-5 bg-card mb-6">
          <h2 className="font-medium mb-3">Pending Approval</h2>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(session.pendingApproval, null, 2)}
          </pre>
          <div className="flex gap-3 mt-4">
            <button
              onClick={approve}
              disabled={actioning}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={reject}
              disabled={actioning}
              className="px-4 py-2 rounded-lg border border-destructive text-destructive text-sm font-medium disabled:opacity-50"
            >
              Request Changes
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Session ID: {session.id} · Started: {new Date(session.createdAt).toLocaleString()}
      </div>
    </div>
  );
}
