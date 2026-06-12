"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PaymentIntegrationAlert } from "@/components/payment-integration-alert";
import { SocketProvider } from "@/lib/socket-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, accessToken } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  const isLoading = !isHydrated || !isAuthenticated;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <SocketProvider token={accessToken}>
      <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <PaymentIntegrationAlert />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </SocketProvider>
  );
}
