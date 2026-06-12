"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { LayoutGrid, UtensilsCrossed, Settings2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuStatsCardProps {
  categories: number
  items: number
  modifiers: number
  siteName: string
  onOnboardClick?: () => void
}

export function MenuStatsCard({ 
  categories, 
  items, 
  modifiers, 
  siteName,
  onOnboardClick 
}: MenuStatsCardProps) {
  const isNew = categories === 0 && items === 0 && modifiers === 0

  return (
    <Card className="w-full border-border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-tight">Menu Overview</h3>
            <p className="text-xs text-muted-foreground font-medium">{siteName}</p>
          </div>
          {isNew ? (
            <div className="bg-muted text-muted-foreground px-2 py-1 rounded text-[10px] font-bold border border-border uppercase tracking-tighter">
              Initial Setup Required
            </div>
          ) : (
            <div className="bg-muted text-foreground px-2 py-1 rounded text-[10px] font-bold border border-border uppercase tracking-tighter">
              Active Menu
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col items-center p-2 bg-muted rounded-lg border border-border">
            <LayoutGrid className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold text-foreground">{categories}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Categories</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted rounded-lg border border-border">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold text-foreground">{items}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Items</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-muted rounded-lg border border-border">
            <Settings2 className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-lg font-bold text-foreground">{modifiers}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Modifiers</span>
          </div>
        </div>

        {isNew && (
          <button 
            onClick={onOnboardClick}
            className="w-full flex items-center justify-between p-3 bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-all group active:scale-[0.98]"
          >
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wide">Start Menu Builder</span>
              <span className="text-[10px] opacity-90">I&apos;ll help you generate categories &amp; items</span>
            </div>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </CardContent>
    </Card>
  )
}
