'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';

interface FinancialReport {
  reportType: string;
  period?: { from: string; to: string };
  data: any;
  isBalanced: boolean;
  siteId: string;
  generatedAt: string;
  disclaimer: string;
}

export default function AccountingRoomPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);

  const runWeekly = async () => {
    setLoading(true);
    try {
      const res = await api.post('/clara/report/weekly');
      setReport(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const runMonthly = async () => {
    setLoading(true);
    try {
      const res = await api.post('/clara/report/monthly');
      setReport(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accounting Room</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clara and Felix manage your books. All reports require your approval before anything is filed.
        </p>
      </div>

      {/* Disclaimer banner — always visible */}
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        AI-generated figures for informational purposes only. Always consult a qualified Chartered Accountant before filing with HMRC, IRS, GST authority, or any official tax body.
      </div>

      <div className="flex gap-3">
        <button
          onClick={runWeekly}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Weekly P&L'}
        </button>
        <button
          onClick={runMonthly}
          disabled={loading}
          className="px-4 py-2 border rounded text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {loading ? 'Running…' : 'Run Monthly Pack'}
        </button>
      </div>

      {report && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold capitalize">{report.reportType.replace('_', ' ')}</h2>
              <span className={`text-xs px-2 py-0.5 rounded ${report.isBalanced ? 'bg-muted text-foreground border border-border' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                {report.isBalanced ? 'Balanced ✓' : 'UNBALANCED ✗'}
              </span>
            </div>
            {report.period && (
              <p className="text-sm text-muted-foreground">
                {new Date(report.period.from).toLocaleDateString()} → {new Date(report.period.to).toLocaleDateString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Sites: {report.siteId} · Generated: {new Date(report.generatedAt).toLocaleString()}</p>
          </div>

          <pre className="rounded-lg border bg-muted/30 p-4 text-xs overflow-x-auto">
            {JSON.stringify(report.data, null, 2)}
          </pre>

          <p className="text-xs text-muted-foreground border border-border rounded p-2">{report.disclaimer}</p>
        </div>
      )}
    </div>
  );
}