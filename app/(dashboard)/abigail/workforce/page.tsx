import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function WorkforceHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workforce Hub</h1>
        <p className="text-muted-foreground">
          Manage AI Agent Skills, Rules, and Plugins.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/abigail/workforce/skills">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Skills
                <Badge variant="secondary">Docs</Badge>
              </CardTitle>
              <CardDescription>
                Markdown files that teach agents how to perform specific tasks or adhere to policies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Manage active skills and domain assignments.
            </CardContent>
          </Card>
        </Link>

        <Link href="/abigail/workforce/rules">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Rules
                <Badge variant="secondary">TSV</Badge>
              </CardTitle>
              <CardDescription>
                Tabular constraints and hard boundaries that override Jos&apos;s base logic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Edit rules for Menu, Marketing, SEO, and more.
            </CardContent>
          </Card>
        </Link>

        <Link href="/abigail/workforce/plugins">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Plugins
                <Badge variant="secondary">Tools</Badge>
              </CardTitle>
              <CardDescription>
                External capabilities and MCP tool definitions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Configure which domains can access which plugins.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
