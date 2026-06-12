"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Sparkles, Settings, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useBusinessContextStore } from "@/lib/business-context-store";
import type { Site } from "@/lib/api/contracts";
import type { WebsiteStatus } from "@/types/website-builder";

interface SiteWithWebsite extends Site {
  websiteStatus?: WebsiteStatus;
  subdomain?: string | null;
}

export default function WebsiteBuilderPage() {
  const router = useRouter();
  const { activeBusinessId } = useBusinessContextStore();

  const { data: sites = [], isLoading } = useQuery<SiteWithWebsite[]>({
    queryKey: ["sites-website", activeBusinessId],
    queryFn: async () => {
      const url = activeBusinessId ? `/sites?businessId=${activeBusinessId}` : "/sites";
      const response = await api.get(url);
      const payload = response.data.data;
      const rawSites = Array.isArray(payload) ? payload : payload?.data ?? [];
      return rawSites as SiteWithWebsite[];
    },
    enabled: true,
  });

  return (
    <div className="flex-1 space-y-4 md:space-y-8 p-4 md:p-8 pt-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-6 md:h-8 w-1 bg-foreground rounded-full" />
            Website Builder
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg">
            AI-powered merchant websites, powered by your POS data.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-[150px]">Site Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Loading sites…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sites.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No sites found.
                  </TableCell>
                </TableRow>
              )}
              {sites.map((site) => {
                const status = site.websiteStatus ?? "draft";
                const hasWebsite = status !== "draft" || !!site.subdomain;
                return (
                  <TableRow key={site.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium py-4">{site.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {site.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                          status === "published"
                            ? "bg-muted text-foreground border-border"
                            : status === "generating"
                              ? "bg-muted text-muted-foreground border-border"
                              : "bg-muted text-muted-foreground border-muted-foreground/20",
                        )}
                      >
                        {status}
                      </Badge>
                      {site.subdomain && (
                        <a
                          href={`https://${site.subdomain}.divepos.com`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-[10px] text-muted-foreground hover:underline inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3 w-3" />
                          {site.subdomain}
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!hasWebsite ? (
                          <Button
                            size="sm"
                            className="bg-foreground text-background hover:bg-foreground/90 text-xs"
                            onClick={() => router.push(`/app-builder/website/${site.id}/generate`)}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Generate with AI
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => router.push(`/app-builder/website/${site.id}/overview`)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Manage
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => router.push(`/app-builder/website/${site.id}/editor`)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Editor
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
