"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Store,
  ShoppingCart,
  UtensilsCrossed,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useBusinessContextStore } from "@/lib/business-context-store";
import { SiteGallery } from "./_components/SiteGallery";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

// Types
type Site = {
  id: string;
  name: string;
  region: string;
  status: "active" | "updating" | "offline";
  type: "ecommerce" | "restaurant" | "retail";
  imageCount?: number;
};

export default function GalleryPage() {
  const router = useRouter();
  const [openSites, setOpenSites] = React.useState<string[]>([]);
  const [activeType, setActiveType] = React.useState("all");
  const { activeBusinessId } = useBusinessContextStore();

  const {
    data: sitesData,
    isLoading,
    error,
  } = useQuery<Site[]>({
    queryKey: ["sites", activeBusinessId],
    queryFn: async () => {
      const url = activeBusinessId ? `/sites?businessId=${activeBusinessId}` : "/sites";
      const response = await api.get(url);
      const payload = response.data.data;
      const rawSites = Array.isArray(payload) ? payload : payload?.data || [];

      return rawSites.map((site: any) => {
        let mappedType = "retail";
        if (site.type === "ECOMMERCE") mappedType = "ecommerce";
        if (site.type === "RESTAURANT") mappedType = "restaurant";

        return {
          id: site.id,
          name: site.name,
          region: site.region || "Local",
          status: site.isActive ? "active" : "offline",
          type: mappedType,
          imageCount: site.imageCount || 0,
        };
      });
    },
    staleTime: 30000,
  });

  const sites: Site[] = (sitesData ?? []).filter((s) => 
    activeType === "all" || s.type === activeType
  );

  const toggleSite = (siteId: string) => {
    setOpenSites((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load sites for the gallery. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // No sites setup state
  if (!isLoading && sites.length === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 text-center p-10">
        <div className="relative">
          <div className="size-20 rounded-3xl bg-muted flex items-center justify-center rotate-3 shadow-sm">
            <Store className="size-10 text-muted-foreground" />
          </div>
          <div className="absolute -bottom-2 -right-2 size-8 rounded-2xl bg-foreground flex items-center justify-center border-4 border-background">
            <AlertCircle className="size-4 text-background" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Setup your store first</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            You need to create at least one location or sales channel before you can manage your media gallery.
          </p>
        </div>
        <Button 
          onClick={() => router.push("/setup-business")}
          className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold h-11 px-8"
        >
          Setup Store Now
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="flex flex-col border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Media Gallery
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
              Manage assets across your locations
            </p>
          </div>
          <Badge variant="outline" className="rounded-lg font-bold border-border text-muted-foreground px-3 py-1">
            {sites.length} Active Sites
          </Badge>
        </div>
        
        <div className="px-6 pb-4">
          <Tabs
            defaultValue="all"
            className="w-full"
            onValueChange={setActiveType}
          >
            <TabsList className="bg-muted/50 p-1 border">
              <TabsTrigger
                value="all"
                className="px-4 md:px-6 text-xs md:text-sm data-[state=active]:text-foreground"
              >
                All Sites
              </TabsTrigger>
              <TabsTrigger
                value="ecommerce"
                className="flex items-center gap-2 px-4 md:px-6 text-xs md:text-sm data-[state=active]:text-foreground"
              >
                <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4" />
                E-Commerce
              </TabsTrigger>
              <TabsTrigger
                value="restaurant"
                className="flex items-center gap-2 px-4 md:px-6 text-xs md:text-sm data-[state=active]:text-foreground"
              >
                <UtensilsCrossed className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Restaurant
              </TabsTrigger>
              <TabsTrigger
                value="retail"
                className="flex items-center gap-2 px-4 md:px-6 text-xs md:text-sm data-[state=active]:text-foreground"
              >
                <Store className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Retail
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-6 overflow-y-auto">
        <div className="rounded-2xl border border-border/50 bg-card/50 shadow-sm overflow-hidden backdrop-blur-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pl-6">
                  Sales Channel
                </TableHead>
                <TableHead className="hidden md:table-cell text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Region
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Type
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Status
                </TableHead>
                <TableHead className="w-[80px] pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6 py-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="pr-6"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                sites.map((site) => (
                  <React.Fragment key={site.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer transition-all duration-200 group border-border/50",
                        openSites.includes(site.id) ? "bg-muted/20" : "hover:bg-muted/30"
                      )}
                      onClick={() => toggleSite(site.id)}
                    >
                      <TableCell className="font-bold py-5 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "size-10 rounded-xl flex items-center justify-center transition-colors",
                            openSites.includes(site.id) ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:bg-muted-foreground group-hover:text-background"
                          )}>
                            <ImageIcon className="size-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black uppercase tracking-tight">{site.name}</span>
                            <span className="md:hidden text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                              {site.region}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-bold text-muted-foreground/80">
                        {site.region}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {site.type === "ecommerce" ? (
                            <ShoppingCart className="size-3.5 text-muted-foreground" />
                          ) : site.type === "restaurant" ? (
                            <UtensilsCrossed className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Store className="size-3.5 text-muted-foreground" />
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                            {site.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-2",
                            site.status === "active"
                              ? "bg-muted text-foreground border-border"
                              : "bg-muted text-muted-foreground border-transparent"
                          )}
                        >
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end">
                          {openSites.includes(site.id) ? (
                            <ChevronUp className="size-5 text-foreground" strokeWidth={3} />
                          ) : (
                            <ChevronDown className="size-5 text-muted-foreground/40 group-hover:text-muted-foreground" strokeWidth={3} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {openSites.includes(site.id) && (
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableCell colSpan={5} className="p-0 border-t border-border/50">
                          <div className="p-6 bg-muted/10">
                            <SiteGallery siteId={site.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
