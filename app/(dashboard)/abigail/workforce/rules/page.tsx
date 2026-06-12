import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function RulesPage() {
  const domains = [
    { id: 'menu', title: 'Menu Domain Rules', desc: 'Halal policies, pricing thresholds, combo requirements' },
    { id: 'marketing', title: 'Marketing Rules', desc: 'Campaign frequency, ad spend limits' },
    { id: 'seo', title: 'SEO Rules', desc: 'Keyword densities, E-E-A-T requirements' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Rules</h1>
        <p className="text-muted-foreground">Manage structured TSV rules per domain.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {domains.map(d => (
          <Link key={d.id} href={`/abigail/workforce/rules/${d.id}`}>
            <Card className="hover:bg-muted/50 transition-colors h-full">
              <CardHeader>
                <CardTitle>{d.title}</CardTitle>
                <CardDescription>{d.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                Click to edit {d.id} rules.
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
