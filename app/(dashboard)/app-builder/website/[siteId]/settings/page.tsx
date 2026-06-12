"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSiteConfig, updateSiteConfig } from "@/lib/api/website-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export default function SiteSettingsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const qc = useQueryClient();
  const { data: site } = useQuery({
    queryKey: ["site-config", siteId],
    queryFn: () => getSiteConfig(siteId),
  });

  const [subdomain, setSubdomain]       = React.useState("");
  const [primaryColor, setPrimaryColor] = React.useState("#c0392b");
  const [fontFamily, setFontFamily]     = React.useState("Inter");
  const [darkMode, setDarkMode]         = React.useState(false);

  React.useEffect(() => {
    if (site) {
      setSubdomain(site.subdomain ?? "");
      setPrimaryColor(site.websiteConfig?.theme?.primaryColor ?? "#c0392b");
      setFontFamily(site.websiteConfig?.theme?.fontFamily ?? "Inter");
      setDarkMode(site.websiteConfig?.theme?.darkMode ?? false);
    }
  }, [site]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSiteConfig(siteId, {
        subdomain: subdomain || undefined,
        theme: { primaryColor, fontFamily, darkMode },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-config", siteId] }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Subdomain</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your site will be available at{" "}
            <strong>{subdomain || "yourstore"}.divepos.com</strong>
          </p>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="your-store-name"
            />
            <span className="text-sm text-muted-foreground">.divepos.com</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 rounded border border-input cursor-pointer"
              />
              <span className="text-sm text-muted-foreground font-mono">{primaryColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Font Family</label>
            <select
              className="rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              {["Inter", "Playfair Display", "Montserrat", "Lato"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="darkMode"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="darkMode" className="text-sm font-medium">Dark Mode</label>
          </div>
        </CardContent>
      </Card>

      <Button
        className="bg-foreground text-background hover:bg-foreground/90"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          : <Save className="h-4 w-4 mr-2" />}
        Save Settings
      </Button>
    </div>
  );
}
