"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { sitesApi } from "@/lib/api/endpoints"
import { Site } from "@/lib/api/contracts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Store, Globe, Smartphone, Coffee, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StoreSelectorProps {
  onSelect: (site: Site) => void
  selectedSiteId?: string
}

export function StoreSelector({ onSelect, selectedSiteId }: StoreSelectorProps) {
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ["sites-list"],
    queryFn: async () => {
      const res = await sitesApi.list()
      return res
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4 px-4 w-full">
        <p className="text-xs text-muted-foreground mb-2">Fetching your stores...</p>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const sitesList = sites?.data || []

  if (error || !sites || sitesList.length === 0) {
    return (
      <div className="mt-4 px-4 py-3 bg-muted/50 rounded-xl text-center">
        <p className="text-sm text-muted-foreground">
          No active stores found. Please check your setup.
        </p>
      </div>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'POS': return <Store className="h-4 w-4" />
      case 'ECOMMERCE': return <Globe className="h-4 w-4" />
      case 'RESTAURANT': return <Coffee className="h-4 w-4" />
      default: return <Smartphone className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-2 mt-4 px-4 w-full overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
        Select a store to manage
      </p>
      <div className="grid gap-2">
        {sitesList.map((site: Site) => (
          <button
            key={site.id}
            onClick={() => onSelect(site)}
            className={cn(
              "group relative flex items-center gap-3 p-3 text-left bg-card hover:bg-muted border rounded-xl transition-all duration-200 active:scale-[0.98]",
              selectedSiteId === site.id ? "border-foreground bg-muted ring-1 ring-foreground/20" : "border-border hover:border-border"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              selectedSiteId === site.id ? "bg-foreground text-background" : "bg-muted group-hover:bg-foreground/10 group-hover:text-foreground"
            )}>
              {getIcon(site.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm truncate text-foreground transition-colors">
                  {site.name}
                </span>
                {site.isActive && (
                  <Badge variant="outline" className="h-4 px-1 text-[10px] font-medium border-border text-foreground bg-muted">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate font-medium uppercase opacity-70">
                {site.type.toLowerCase()}
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-transparent group-hover:bg-muted transition-colors">
              {selectedSiteId === site.id ? (
                <Check className="h-3 w-3 text-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
