"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCoordinator } from "@/hooks/useCoordinator";
import { SetupAIModal } from "@/components/ai-chat/SetupAIModal";

export function SiteHeader() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isCoding =
    pathname.startsWith("/coding") ||
    pathname.startsWith("/general") ||
    pathname.startsWith("/research");

  const { coordinator, loading, markSetupDone } = useCoordinator();

  const title = isCoding
    ? (coordinator?.name ?? "Abigail AI")
    : "Dashboard";
  const [modalOpen, setModalOpen] = React.useState(false);

  const sidebarUser = {
    name:
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || "User",
    email: user?.email || "user@example.com",
    avatar: "/avatars/shadcn.jpg",
  };

  return (
    <>
      <header className={cn(
        "flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)",
        !isCoding && "border-b border-border"
      )}>
        <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
          <div className="flex items-center gap-1 lg:gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 h-4 data-vertical:self-auto"
            />
            <h1 className="text-base font-semibold text-foreground">{title}</h1>

            {isCoding && !loading && (
              coordinator ? (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 ml-2 rounded-full border border-border/40 bg-muted/30 px-2.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-muted/60 hover:border-border/70 transition-colors"
                >
                  <Sparkles className="size-3 text-foreground/40" />
                  {coordinator.name}
                </button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="ml-2 h-7 rounded-full border border-dashed border-border/60 px-3 text-[12px] text-muted-foreground hover:text-foreground hover:border-border"
                >
                  <Sparkles className="size-3 mr-1.5" />
                  Setup AI Model
                </Button>
              )
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
            <NavUser user={sidebarUser} variant="topbar" />
          </div>
        </div>
      </header>

      <SetupAIModal
        open={modalOpen}
        onComplete={() => {
          setModalOpen(false);
          markSetupDone();
        }}
      />
    </>
  );
}
