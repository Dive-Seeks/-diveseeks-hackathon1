"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border-border bg-card">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total Revenue</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums text-foreground">
            $1,250.00
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <TrendingUpIcon className="size-3.5" />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-foreground">
            Trending up this month <TrendingUpIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Visitors for the last 6 months
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-border bg-card">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">New Customers</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums text-foreground">
            1,234
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <TrendingDownIcon className="size-3.5" />
              -20%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-foreground">
            Down 20% this period <TrendingDownIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
            Acquisition needs attention
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-border bg-card">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Active Accounts</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums text-foreground">
            45,678
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <TrendingUpIcon className="size-3.5" />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-foreground">
            Strong user retention <TrendingUpIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      <Card className="@container/card border-border bg-card">
        <CardHeader>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Growth Rate</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums text-foreground">
            4.5%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-muted-foreground border-border">
              <TrendingUpIcon className="size-3.5" />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium text-foreground">
            Steady performance increase <TrendingUpIcon className="size-3.5 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Meets growth projections</div>
        </CardFooter>
      </Card>
    </div>
  );
}
