'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [preset, setPreset] = useState<string[]>(['balanced']);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call an endpoint to update the TSV snapshot
      // POST /api/jos/settings { strategyPreset: preset }
      toast.success('Strategy preset updated to ' + preset[0]);
    } catch (err) {
      toast.error('Failed to update strategy preset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your AI Workforce configuration and preferences.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">AI Workforce Strategy Preset</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Control how Jos allocates the AI workforce budget and priorities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleGroup
            value={preset}
            onValueChange={(val) => { if (val.length) setPreset(val); }}
            className="justify-start gap-2 flex-wrap"
          >
            <ToggleGroupItem value="balanced" className="w-full sm:w-auto px-6 py-3 h-auto flex flex-col items-start text-left border border-border data-[state=on]:bg-muted data-[state=on]:text-foreground transition-colors">
              <span className="font-semibold text-sm mb-1">Balanced (Default)</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">50% Growth, 30% Opt, 20% Repair</span>
            </ToggleGroupItem>
            
            <ToggleGroupItem value="growth" className="w-full sm:w-auto px-6 py-3 h-auto flex flex-col items-start text-left border border-border data-[state=on]:bg-muted data-[state=on]:text-foreground transition-colors">
              <span className="font-semibold text-sm mb-1">Growth</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">80% Growth, 15% Opt, 5% Repair</span>
            </ToggleGroupItem>
            
            <ToggleGroupItem value="harden" className="w-full sm:w-auto px-6 py-3 h-auto flex flex-col items-start text-left border border-border data-[state=on]:bg-muted data-[state=on]:text-foreground transition-colors">
              <span className="font-semibold text-sm mb-1">Harden</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">20% Growth, 40% Opt, 40% Repair</span>
            </ToggleGroupItem>
            
            <ToggleGroupItem value="repair-only" className="w-full sm:w-auto px-6 py-3 h-auto flex flex-col items-start text-left border border-border data-[state=on]:bg-destructive/10 data-[state=on]:text-destructive transition-colors">
              <span className="font-semibold text-sm mb-1">Repair Only</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">100% Repair. Pauses sessions.</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
        <CardFooter className="border-t border-border mt-4 pt-4">
          <Button variant="default" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}