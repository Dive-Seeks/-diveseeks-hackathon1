"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  LayoutGrid,
  ListTree,
  Settings2,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { socket } from "@/lib/socket";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useBusinessContextStore } from "@/lib/business-context-store";

// Types
type Site = {
  id: string;
  name: string;
  region: string;
  status: "active" | "updating" | "offline";
  itemCount: number;
  categoryCount: number;
  modifierCount: number;
  type: "ecommerce" | "restaurant" | "retail";
  activeMenuId?: string | null;
  activeMenuName?: string | null;
};

export default function MenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const [openSites, setOpenSites] = React.useState<string[]>([]);
  const [activeType, setActiveType] = React.useState<string>("all");

  const { activeBusinessId } = useBusinessContextStore();

  const {
    data: sitesData,
    isLoading,
    error,
    refetch,
  } = useQuery<Site[]>({
    queryKey: ["sites", activeBusinessId],
    queryFn: async () => {
      const url = activeBusinessId ? `/sites?businessId=${activeBusinessId}` : '/sites';
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
          itemCount: site.itemCount || 0,
          categoryCount: site.categoryCount || 0,
          modifierCount: site.modifierCount || 0,
          activeMenuId: site.activeMenuId,
          activeMenuName: site.activeMenuName,
          type: mappedType,
        };
      });
    },
    // We should fetch sites even if activeBusinessId is null to show ALL sites the user has access to
    // enabled: !!activeBusinessId,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const sites: Site[] = sitesData ?? [];

  const toggleSite = (siteId: string) => {
    setOpenSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId],
    );
  };
  
  const handleDeleteMenu = async (menuId: string, siteId: string) => {
    try {
      await api.delete(`/menus/${menuId}?siteId=${siteId}`);
      toast.success("Menu deleted successfully from this site.");
      refetch();
    } catch (error) {
      console.error("Failed to delete menu:", error);
      toast.error("Failed to delete menu. Please try again.");
    }
  };

  const filteredSites = React.useMemo(() => {
    let result = sites;

    if (activeType !== "all") {
      result = result.filter((site) => site.type === activeType);
    }

    if (filter === "categories") {
      result = result.filter((site) => site.categoryCount > 0);
    } else if (filter === "modifiers") {
      result = result.filter((site) => site.modifierCount > 0);
    }

    return result;
  }, [sites, activeType, filter]);

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load sites. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="flex items-center justify-between">
        <Tabs
          defaultValue="all"
          className="w-full"
          onValueChange={setActiveType}
        >
          <TabsList className="bg-muted/50 p-1 border">
            <TabsTrigger
              value="all"
              className="px-4 md:px-6 text-xs data-[state=active]:text-foreground"
            >
              All Sites
            </TabsTrigger>
            <TabsTrigger
              value="ecommerce"
              className="flex items-center gap-2 px-4 md:px-6 text-xs data-[state=active]:text-foreground"
            >
              <ShoppingCart className="size-3.5" />
              E-Commerce
            </TabsTrigger>
            <TabsTrigger
              value="restaurant"
              className="flex items-center gap-2 px-4 md:px-6 text-xs data-[state=active]:text-foreground"
            >
              <UtensilsCrossed className="size-3.5" />
              Restaurant
            </TabsTrigger>
            <TabsTrigger
              value="retail"
              className="flex items-center gap-2 px-4 md:px-6 text-xs data-[state=active]:text-foreground"
            >
              <Store className="size-3.5" />
              Retail
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="min-w-[150px] text-xs font-medium uppercase tracking-widest">Sales Channel</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-medium uppercase tracking-widest">Region</TableHead>
                <TableHead className="hidden lg:table-cell text-center text-xs font-medium uppercase tracking-widest">
                  Categories
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center text-xs font-medium uppercase tracking-widest">
                  Modifiers
                </TableHead>
                <TableHead className="hidden lg:table-cell text-center text-xs font-medium uppercase tracking-widest">
                  Items
                </TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-widest">Status</TableHead>
                <TableHead className="w-[50px] md:w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-32" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <Skeleton className="h-6 w-8 mx-auto" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <Skeleton className="h-6 w-8 mx-auto" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-center">
                      <Skeleton className="h-6 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No sites found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site) => (
                  <React.Fragment key={site.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleSite(site.id)}
                    >
                      <TableCell className="font-medium py-3 md:py-4">
                        <div className="flex flex-col gap-1">
                          <span>{site.name}</span>
                          <span className="md:hidden text-[10px] text-muted-foreground font-normal">
                            {site.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {site.region}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <Badge variant="secondary" className="font-mono">
                          {site.categoryCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <Badge variant="secondary" className="font-mono">
                          {site.modifierCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-center">
                        <Badge
                          variant="secondary"
                          className="font-mono bg-muted text-foreground border-border"
                        >
                          {site.itemCount}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 md:px-3 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                            site.status === "active"
                              ? "bg-muted text-foreground border-border"
                              : site.status === "updating"
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-muted text-muted-foreground border-muted-foreground/20",
                          )}
                        >
                          {site.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {openSites.includes(site.id) ? (
                            <ChevronUp className="size-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {openSites.includes(site.id) && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="p-0 border-t bg-muted/5 animate-in fade-in duration-300"
                        >
                          <div className="p-4 md:p-8 grid gap-4 md:gap-8 grid-cols-1 sm:grid-cols-4">
                            <Button
                              onClick={() =>
                                router.push(`/sites/${site.id}/menu`)
                              }
                              variant="outline"
                              className="h-24 flex flex-col gap-2 border-border border-dashed hover:bg-muted transition-all"
                            >
                              <ListTree className="size-6 text-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">
                                  Manage Items
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Prices, Stock & Details
                                </span>
                              </div>
                            </Button>
                            <Button
                              onClick={() => router.push("/menu/categories")}
                              variant="outline"
                              className="h-24 flex flex-col gap-2 border-border border-dashed hover:bg-muted transition-all"
                            >
                              <LayoutGrid className="size-6 text-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">
                                  Categories
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Organize your menu
                                </span>
                              </div>
                            </Button>
                            <Button
                              onClick={() => router.push("/menu/modifiers")}
                              variant="outline"
                              className="h-24 flex flex-col gap-2 border-border border-dashed hover:bg-muted transition-all"
                            >
                              <UtensilsCrossed className="size-6 text-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">
                                  Modifiers
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Add-ons & Options
                                </span>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="h-24 flex flex-col gap-2 border-border border-dashed hover:bg-muted transition-all"
                            >
                              <Settings2 className="size-6 text-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">
                                  Global Settings
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                  Taxes & Syncing
                                </span>
                              </div>
                            </Button>

                            {site.activeMenuId && (
                              <AlertDialog>
                                <AlertDialogTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      className="h-24 flex flex-col gap-2 border-dashed border-destructive/30 hover:border-destructive hover:bg-destructive/5 transition-all group"
                                    >
                                      <Trash2 className="h-6 w-6 text-destructive group-hover:scale-110 transition-transform" />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-destructive">
                                          Delete Menu
                                        </span>
                                        <span className="text-[10px] text-destructive/70 truncate max-w-[120px]">
                                          {site.activeMenuName || "Active Menu"}
                                        </span>
                                      </div>
                                    </Button>
                                  }
                                />
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <Trash2 className="h-5 w-5 text-destructive" />
                                      Delete Menu?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will remove &quot;<strong>{site.activeMenuName}</strong>&quot; 
                                      from this site. If this menu is not used by other sites, 
                                      it will be deleted from the database.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteMenu(site.activeMenuId!, site.id)}
                                      className="bg-destructive hover:bg-destructive/90 focus:ring-destructive"
                                    >
                                      Delete Forever
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
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
