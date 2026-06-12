"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSiteConfig, updateSiteConfig } from "@/lib/api/website-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export default function SiteSeoPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const qc = useQueryClient();
  const { data: site } = useQuery({
    queryKey: ["site-config", siteId],
    queryFn: () => getSiteConfig(siteId),
  });

  const [title, setTitle]           = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (site?.websiteConfig?.seo) {
      setTitle(site.websiteConfig.seo.title);
      setDescription(site.websiteConfig.seo.description);
    }
  }, [site]);

  const mutation = useMutation({
    mutationFn: () => updateSiteConfig(siteId, { seo: { title, description } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-config", siteId] }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>SEO Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Page Title{" "}
              <span className="text-muted-foreground font-normal">({title.length}/60)</span>
            </label>
            <input
              className="rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="My Restaurant — Best Food in London"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Meta Description{" "}
              <span className="text-muted-foreground font-normal">({description.length}/160)</span>
            </label>
            <textarea
              className="rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-border resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={160}
              placeholder="Describe your business in 1-2 sentences for Google..."
            />
          </div>
          {/* Live Google preview */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Google Preview</p>
            <p className="text-foreground text-base font-medium truncate">{title || "Your Page Title"}</p>
            <p className="text-muted-foreground text-xs">
              https://{site?.subdomain ?? "yourstore"}.divepos.com
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description || "Your meta description will appear here..."}
            </p>
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
        Save SEO Settings
      </Button>
    </div>
  );
}
