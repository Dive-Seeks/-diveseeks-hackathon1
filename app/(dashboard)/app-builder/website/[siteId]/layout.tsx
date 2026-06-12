"use client";
import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getSiteConfig } from "@/lib/api/website-builder";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutDashboard, PenLine, Settings, Search, Loader2 } from "lucide-react";

const NAV = [
  { label: "Overview", href: "overview", icon: LayoutDashboard },
  { label: "Editor",   href: "editor",   icon: PenLine },
  { label: "SEO",      href: "seo",      icon: Search },
  { label: "Settings", href: "settings", icon: Settings },
];

export default function SiteDashboardLayout({ children }: { children: React.ReactNode }) {
  const { siteId } = useParams<{ siteId: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const { data: site, isLoading } = useQuery({
    queryKey: ["site-config", siteId],
    queryFn: () => getSiteConfig(siteId),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      <div className="border-b bg-card px-4 md:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/app-builder/website")}>
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <div>
              <h2 className="text-lg font-bold">{site?.name}</h2>
              <p className="text-xs text-muted-foreground">
                {site?.websiteConfig?.templateFamily === "modern" ? "Modern (Rayo)" : "Classic (Resonance)"}
                {" · "}
                {site?.websiteConfig?.templateId ?? "No template"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase",
              site?.websiteStatus === "published"  && "bg-muted text-foreground border-border",
              site?.websiteStatus === "generating" && "bg-muted text-muted-foreground border-border",
              !site?.websiteStatus || site.websiteStatus === "draft" && "bg-muted text-muted-foreground",
            )}
          >
            {site?.websiteStatus ?? "draft"}
          </Badge>
        </div>

        <div className="flex gap-1">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname.includes(`/${href}`);
            return (
              <button
                key={href}
                onClick={() => router.push(`/app-builder/website/${siteId}/${href}`)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8">{children}</div>
    </div>
  );
}
