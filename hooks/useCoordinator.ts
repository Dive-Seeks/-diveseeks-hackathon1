"use client";

import * as React from "react";
import { fetchCoordinatorScope } from "@/lib/abigail-api";
import { useAuthStore } from "@/lib/auth-store";
import type { Agent } from "@/lib/abigail-api";

type CoordinatorState = {
  coordinator: Agent | null;
  loading: boolean;
  refresh: () => void;
  markSetupDone: () => void;
};

function setupKey(tenantId: string) {
  return `ds:setup:${tenantId}`;
}

export function hasCompletedSetup(tenantId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(setupKey(tenantId)) === "1";
}

export function markSetupComplete(tenantId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(setupKey(tenantId), "1");
}

export function useCoordinator(): CoordinatorState {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tenantId = user?.tenantId ?? "";
  const isLoggedIn = !!user;
  const [coordinator, setCoordinator] = React.useState<Agent | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    // isHydrated: storage has been read. isAuthenticated: token has been validated/refreshed.
    // Both must be true before calling the API — isHydrated alone fires before token refresh.
    if (!isHydrated || !isAuthenticated) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchCoordinatorScope()
      .then((res) => {
        if (cancelled) return;
        const coord = res.data.data.find((a) => a.role === "coordinator") ?? null;
        // Only surface the coordinator once they have a real name.
        // "Abigail" is the platform default — treat it as not-yet-set-up
        // so the "Setup AI Model" prompt still appears for first-time users.
        if (coord && coord.name !== "Abigail") {
          setCoordinator(coord);
          markSetupComplete(tenantId);
        } else if (hasCompletedSetup(tenantId)) {
          // User completed setup before — show coordinator even if name is default
          setCoordinator(coord);
        } else {
          setCoordinator(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCoordinator(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, isLoggedIn, tenantId, tick]);

  const markSetupDone = React.useCallback(() => {
    markSetupComplete(tenantId);
    setTick((t) => t + 1);
  }, [tenantId]);

  const refresh = React.useCallback(() => setTick((t) => t + 1), []);

  return { coordinator, loading, refresh, markSetupDone };
}
