'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { getCookie } from 'cookies-next';

export default function DomainRulesPage({ params }: { params: Promise<{ domain: string }> }) {
  const [domain, setDomain] = useState<string>('');
  const [ruleData, setRuleData] = useState<{ columns: string[], rows: Record<string, string>[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setDomain(p.domain);
      fetchRules(p.domain);
    });
  }, [params]);

  const fetchRules = async (d: string) => {
    try {
      const token = getCookie('accessToken');
      const res = await fetch(`http://localhost:7771/api/workforce/rules/builtin?domain=${d}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRuleData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight capitalize">{domain} Rules</h1>
        <p className="text-muted-foreground">Hard boundaries applied before any LLM inference.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {!ruleData || ruleData.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules defined for this domain.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {ruleData.columns.map(col => (
                      <TableHead key={col} className="font-semibold">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ruleData.rows.map((row, i) => (
                    <TableRow key={i}>
                      {ruleData.columns.map(col => (
                        <TableCell key={col}>{row[col]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
