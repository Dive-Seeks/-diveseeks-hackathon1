'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { getCookie } from 'cookies-next';
import { TrendingUp, TrendingDown, Minus, Brain, CheckCircle, XCircle, HelpCircle, Star } from 'lucide-react';

interface DomainKnowledge {
  domain: string;
  knownPatterns: string[];
  approvalRate: number;
  lastUpdated: string;
  warningFlags: string[];
}

interface TenantBrain {
  tenantId: string;
  generatedAt: string;
  sessionCount: number;
  approvalRateTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  business: {
    cuisine: string;
    businessType: string;
    tone: string;
    targetCustomers: string;
    keyValues: string[];
  };
  preferences: string[];
  domainKnowledge: DomainKnowledge[];
  whatWorked: string[];
  whatFailed: string[];
  openQuestions: string[];
  strategyPreset: string;
  overallHealthScore: number;
}

// Synthesised brain fields may be strings or objects ({pattern, ...}) - never render raw.
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const candidate = v.pattern ?? v.text ?? v.summary ?? v.question ?? v.description;
    if (typeof candidate === 'string') return candidate;
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="size-4 text-foreground" />;
  if (trend === 'declining') return <TrendingDown className="size-4 text-destructive" />;
  if (trend === 'stable') return <Minus className="size-4 text-muted-foreground" />;
  return <Minus className="size-4 text-muted-foreground" />;
}

function ApprovalBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'bg-foreground' : pct >= 50 ? 'bg-muted-foreground' : 'bg-destructive';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8">{pct}%</span>
    </div>
  );
}

export default function BrainPage() {
  const [brain, setBrain] = useState<TenantBrain | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [synthesising, setSynthesising] = useState(false);

  useEffect(() => {
    const fetchBrain = async () => {
      try {
        const token = getCookie('accessToken');
        const res = await fetch('/api/memory/brain', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.empty) {
            setEmpty(true);
          } else {
            setBrain(data.data);
          }
        }
      } catch {
        setEmpty(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBrain();
  }, []);

  const handleSynthesise = async () => {
    setSynthesising(true);
    try {
      const token = getCookie('accessToken');
      await fetch('/api/memory/brain/synthesise', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      window.location.reload();
    } finally {
      setSynthesising(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (empty || !brain) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Brain className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">No brain context yet</h2>
        <p className="mb-6 text-muted-foreground">
          Complete and approve a session with your AI workforce to start building your business brain.
          The more sessions you complete, the smarter your AI team gets.
        </p>
        <button
          onClick={handleSynthesise}
          disabled={synthesising}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {synthesising ? 'Synthesising...' : 'Build Brain Now'}
        </button>
      </div>
    );
  }

  const trendLabel = {
    improving: 'Improving',
    stable: 'Stable',
    declining: 'Declining',
    insufficient_data: 'Not enough data',
  }[brain.approvalRateTrend];

  const healthPct = Math.round(brain.overallHealthScore * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">What Your AI Team Knows</h1>
          <p className="text-muted-foreground">
            Updated after every approved session - {brain.sessionCount} sessions completed
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendIcon trend={brain.approvalRateTrend} />
          {trendLabel}
        </div>
      </div>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>What your AI team understands about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Cuisine / Category</span>
              <p className="text-muted-foreground">{brain.business.cuisine}</p>
            </div>
            <div>
              <span className="font-medium">Business Type</span>
              <p className="text-muted-foreground capitalize">{brain.business.businessType}</p>
            </div>
            <div>
              <span className="font-medium">Communication Tone</span>
              <p className="text-muted-foreground">{brain.business.tone}</p>
            </div>
            <div>
              <span className="font-medium">Target Customers</span>
              <p className="text-muted-foreground">{brain.business.targetCustomers}</p>
            </div>
          </div>
          {brain.business.keyValues.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {brain.business.keyValues.map((v, i) => (
                <Badge key={i} variant="secondary">{asText(v)}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Health */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Health Score</CardTitle>
          <CardDescription>How well your AI team is performing across all domains</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{healthPct}%</div>
            <div className="flex-1">
              <ApprovalBar rate={brain.overallHealthScore} />
              <p className="mt-1 text-xs text-muted-foreground">
                Strategy: <span className="font-medium capitalize">{brain.strategyPreset}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Known Preferences */}
      {brain.preferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learned Preferences</CardTitle>
            <CardDescription>Rules your AI team always applies based on your feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brain.preferences.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Star className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {asText(p)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Domain Knowledge */}
      {brain.domainKnowledge.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Knowledge</CardTitle>
            <CardDescription>What each specialist has learned about your business</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {brain.domainKnowledge.map((d) => (
              <div key={d.domain} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{d.domain}</span>
                  <ApprovalBar rate={d.approvalRate} />
                </div>
                {d.knownPatterns.length > 0 && (
                  <ul className="space-y-1">
                    {d.knownPatterns.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-foreground" />
                        {asText(p)}
                      </li>
                    ))}
                  </ul>
                )}
                {d.warningFlags.length > 0 && (
                  <ul className="space-y-1">
                    {d.warningFlags.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                        {asText(w)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* What's Working */}
      {brain.whatWorked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>What's Working</CardTitle>
            <CardDescription>Approaches your team has learned you consistently approve</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brain.whatWorked.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-foreground" />
                  {asText(w)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* What We're Refining */}
      {brain.whatFailed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas We're Refining</CardTitle>
            <CardDescription>Approaches that haven't worked - your team won't repeat these</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brain.whatFailed.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  {asText(f)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Open Questions */}
      {brain.openQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Help Us Understand</CardTitle>
            <CardDescription>
              Your AI team needs your input on these - join the relevant chat room to clarify
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brain.openQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {asText(q)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Last synthesised: {new Date(brain.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
