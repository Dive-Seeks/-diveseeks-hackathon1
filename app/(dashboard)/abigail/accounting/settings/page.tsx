'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useState } from 'react';

const SCHEDULE_OPTIONS = [
  { value: 'off',     label: 'Off — run manually only' },
  { value: 'weekly',  label: 'Weekly — every Monday morning' },
  { value: 'monthly', label: 'Monthly — 1st of each month' },
];

export default function AccountingSettingsPage() {
  const qc = useQueryClient();
  const { data: company } = useQuery({
    queryKey: ['accounting', 'company'],
    queryFn: () => api.get('/accounting/company').then(r => r.data.data),
  });

  const [schedule, setSchedule] = useState<string>('off');
  const [scope, setScope] = useState<string>('all');

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/accounting/company', { caSchedule: schedule, caScope: scope }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting', 'company'] }),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Accounting Schedule</h2>
      <p className="text-sm text-muted-foreground">
        Choose how often Clara runs your accounting reports. You always approve before anything is sent.
      </p>

      <div className="space-y-3">
        <label className="block text-sm font-medium">Report Schedule</label>
        {SCHEDULE_OPTIONS.map(opt => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="schedule"
              value={opt.value}
              checked={schedule === opt.value}
              onChange={() => setSchedule(opt.value)}
              className="accent-primary"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Report Scope</label>
        <select
          value={scope}
          onChange={e => setScope(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm bg-background"
        >
          <option value="all">All sites — consolidated group view</option>
          <option value="per_site">Per site + consolidated</option>
        </select>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium"
      >
        Save Settings
      </button>
    </div>
  );
}