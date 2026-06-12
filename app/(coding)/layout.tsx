"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { LlmKeyAlert } from "@/components/coding/LlmKeyAlert";
import { SocketProvider } from "@/lib/socket-context";

export default function CodingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, accessToken } = useAuthStore();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  // Force dark mode for coder workspace; restore previous theme on leave
  useEffect(() => {
    const previous = theme;
    setTheme("dark");
    return () => {
      if (previous) setTheme(previous);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
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
      <AppSidebar />
      <SidebarInset className="overflow-hidden bg-background border-none shadow-none">
        <SiteHeader />
        <LlmKeyAlert />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </SocketProvider>
  );
}
