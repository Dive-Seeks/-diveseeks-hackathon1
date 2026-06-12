"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSiteConfig, updateSiteConfig, publishSite } from "@/lib/api/website-builder";
import { PuckWrapper } from "./_components/PuckWrapper";
import type { PuckData } from "@/types/website-builder";
import { Loader2 } from "lucide-react";

export default function SiteEditorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: site, isLoading } = useQuery({
    queryKey: ["site-config", siteId],
    queryFn: () => getSiteConfig(siteId),
  });

  const saveMutation = useMutation({
    mutationFn: (puckData: PuckData) => updateSiteConfig(siteId, { puckData }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-config", siteId] }),
  });

  const publishMutation = useMutation({
    mutationFn: async (puckData: PuckData) => {
      await updateSiteConfig(siteId, { puckData });
      return publishSite(siteId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-config", siteId] });
      router.push(`/app-builder/website/${siteId}/overview`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (!site?.websiteConfig) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No website generated yet. Go to Overview to generate one.
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8">
      <PuckWrapper
        initialData={site.websiteConfig.puckData}
        templateFamily={site.websiteConfig.templateFamily}
        theme={site.websiteConfig.theme}
        siteName={site.name}
        isSaving={saveMutation.isPending}
        isPublishing={publishMutation.isPending}
        onSave={(data) => saveMutation.mutate(data)}
        onPublish={(data) => publishMutation.mutate(data)}
      />
    </div>
  );
}