"use client";

import * as React from "react";
import { StoreRecordsTable } from "../store-records-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Store, Clock, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { apiClient } from "@/lib/api/client";

export default function SubmittedStorePage() {
  const { user } = useAuthStore();
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    pending: 0,
    avgCompletionTime: "24h"
  });

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiClient.get<any>("/businesses/store/submitted");
        const businesses = Array.isArray(response?.data) ? response.data : [];
        if (businesses.length > 0) {
          const total = businesses.length;
          const active = businesses.filter((b: any) => b.status === "ACTIVE").length;
          const pending = businesses.filter(
            (b: any) => 
              b.status === "SUBMITTED" || 
              b.status === "PENDING" || 
              b.status === "PENDING_REVIEW"
          ).length;
          setStats((prev) => ({ ...prev, total, active, pending }));
        }
      } catch (error) {
        console.error("Failed to fetch store stats", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-8 animate-in fade-in duration-500">
      {/* Left Pane - Summary Metrics */}
      <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              Submission Overview
            </CardTitle>
            <CardDescription>
              Performance metrics for your business portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-3">
                <Store className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Stores</span>
              </div>
              <span className="text-lg font-bold">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <span className="text-lg font-bold text-foreground">{stats.active}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pending Review</span>
              </div>
              <span className="text-lg font-bold text-muted-foreground">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Verified User</p>
                <p className="text-sm font-medium">{user?.email || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Tier</p>
                <p className="text-sm font-medium">Business Pro</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Pane - Records Table */}
      <div className="flex-1">
        <StoreRecordsTable
          status="submitted"
          title="Submitted Stores"
          description="Manage and monitor all submitted business records."
        />
      </div>
    </div>
  );
}

