'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { format } from 'date-fns';
import { getCookie } from 'cookies-next';

interface EvolutionEvent {
  id: string;
  domain: string;
  intent: string;
  agent: string;
  signals: string[];
  genes_used: string[];
  outcome: { status: string; score: number; approval?: boolean };
  meta: { note: string };
  created_at: string;
}

export default function EvolutionTimelinePage() {
  const [events, setEvents] = useState<EvolutionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = getCookie('accessToken');
        const res = await fetch('http://localhost:7771/api/abigail/evolution-events', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch evolution events', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Workforce Evolution</h1>
        <p className="text-muted-foreground">
          Immutable audit trail of what the AI workforce learned, when, and with what outcome.
        </p>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No evolution events recorded yet.
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={event.outcome.status === 'success' ? 'default' : 'destructive'}>
                      {event.outcome.status}
                    </Badge>
                    <span className="font-semibold text-sm">{event.domain} / {event.intent}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{event.meta?.note || 'No description'}</CardTitle>
                <CardDescription>
                  Agent: <span className="font-medium">{event.agent}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.signals && event.signals.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Signals</span>
                    <div className="flex flex-wrap gap-1">
                      {event.signals.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {event.genes_used && event.genes_used.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">Genes Applied</span>
                    <div className="flex flex-wrap gap-1">
                      {event.genes_used.map((g, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono">{g}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
