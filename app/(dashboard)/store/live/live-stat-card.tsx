"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveStatCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function LiveStatCard({
  title,
  value,
  description,
  trend,
  trendValue,
}: LiveStatCardProps) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-border transition-all duration-300 group relative overflow-hidden">
      <div className="absolute -top-2 -right-2 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        {trend === "up" && (
          <TrendingUp className="h-16 w-16 text-muted-foreground" />
        )}
        {trend === "down" && (
          <TrendingDown className="h-16 w-16 text-muted-foreground" />
        )}
        {trend === "neutral" && <Minus className="h-16 w-16 text-muted-foreground" />}
      </div>
      <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0 gap-2 relative z-10 pr-2">
        <CardTitle className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] leading-none pt-1.5 truncate max-w-[55%]">
          {title}
        </CardTitle>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap border",
              trend === "up" &&
                "bg-muted text-foreground border-border",
              trend === "down" &&
                "bg-destructive/10 text-destructive border-destructive/20",
              trend === "neutral" &&
                "bg-muted text-muted-foreground border-border",
            )}
          >
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {trend === "neutral" && <Minus className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-4 relative z-10">
        <div className="text-2xl md:text-3xl font-black tracking-tighter text-foreground transition-colors">
          {value}
        </div>
        <p className="text-[10px] md:text-[11px] text-muted-foreground/70 font-semibold mt-1.5 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
