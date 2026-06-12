'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { getCookie } from 'cookies-next';

interface PluginManifest {
  name: string;
  description: string;
  version: string;
  domains: string[];
  tools: { name: string; description: string }[];
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const token = getCookie('accessToken');
        const res = await fetch('http://localhost:7771/api/workforce/plugins/scan', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPlugins(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlugins();
  }, []);

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Plugins</h1>
        <p className="text-muted-foreground">External capabilities and tool definitions.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {plugins.map((plugin) => (
          <Card key={plugin.name}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="flex items-center gap-2">
                  {plugin.name}
                  <Badge variant="secondary">v{plugin.version}</Badge>
                </CardTitle>
              </div>
              <CardDescription>{plugin.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Allowed Domains</h4>
                <div className="flex gap-2 flex-wrap">
                  {plugin.domains.map(domain => (
                    <Badge key={domain} variant="outline">{domain}</Badge>
                  ))}
                  {plugin.domains.length === 0 && <span className="text-sm text-muted-foreground">All Domains</span>}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Provided Tools</h4>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {plugin.tools.map(t => (
                    <li key={t.name}><span className="font-mono">{t.name}</span>: {t.description}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
