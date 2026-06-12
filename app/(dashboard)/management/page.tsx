"use client";

import * as React from "react";
import { BusinessBreadcrumbs } from "@/components/setup-business/BusinessBreadcrumbs";
import { BusinessManagementCards } from "@/components/setup-business/BusinessManagementCards";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BusinessManagementPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <BusinessBreadcrumbs />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            Business Management
          </h1>
          <p className="text-muted-foreground">
            Manage your business setup progress and live stores.
          </p>
        </div>
        <Button onClick={() => router.push("/setup-business")}>
          <PlusIcon className="mr-2 size-4" />
          New Business
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <BusinessManagementCards />
      </div>
    </div>
  );
}
