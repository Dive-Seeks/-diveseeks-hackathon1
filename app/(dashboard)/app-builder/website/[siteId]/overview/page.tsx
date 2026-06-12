"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSiteConfig, publishSite } from "@/lib/api/website-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, PenLine, Search, Wand2, Loader2, ExternalLink } from "lucide-react";

export default function SiteOverviewPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: site } = useQuery({
    queryKey: ["site-config", siteId],
    queryFn: () => getSiteConfig(siteId),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishSite(siteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-config", siteId] }),
  });

  const config = site?.websiteConfig;
  const blockCount = config?.puckData?.content?.length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold capitalize">{config?.templateFamily ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{config?.templateId ?? "Not generated"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{blockCount}</p>
            <p className="text-xs text-muted-foreground">Page blocks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Subdomain</CardTitle>
          </CardHeader>
          <CardContent>
            {site?.subdomain ? (
              <a
                href={`http://${site.subdomain}.divepos.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-sm flex items-center gap-1 hover:text-foreground"
              >
                {site.subdomain}.divepos.com <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Not set</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!config ? (
          <Button
            className="h-24 flex flex-col gap-2 col-span-full bg-foreground text-background hover:bg-foreground/90"
            onClick={() => router.push(`/app-builder/website/${siteId}/generate`)}
          >
            <Wand2 className="h-6 w-6" />
            <span className="font-bold">Generate with AI</span>
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-1 border-dashed hover:border-border hover:bg-muted"
              onClick={() => router.push(`/app-builder/website/${siteId}/editor`)}
            >
              <PenLine className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-bold">Open Visual Editor</span>
              <span className="text-[10px] text-muted-foreground">Drag, drop, and edit content</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-1 border-dashed hover:border-border hover:bg-muted"
              onClick={() => router.push(`/app-builder/website/${siteId}/seo`)}
            >
              <Search className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-bold">SEO Settings</span>
              <span className="text-[10px] text-muted-foreground">Title, description, meta</span>
            </Button>
            {site?.websiteStatus !== "published" && (
              <Button
                className="h-20 flex flex-col gap-1 col-span-full bg-foreground text-background hover:bg-foreground/90"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Globe className="h-5 w-5" />}
                <span className="font-bold">
                  {publishMutation.isPending ? "Publishing..." : "Publish Website"}
                </span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
