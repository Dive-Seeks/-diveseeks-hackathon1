"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/auth-store";
import { getProjectVision } from "@/lib/projects-api";
import axios from "axios";

type VisionState = "loading" | "missing" | "exists";

export function useProjectVision(projectId: string | null | undefined) {
  const ready = useAuthStore((s) => s.isHydrated && s.isAuthenticated);
  // Include accessToken so the fetch re-runs after a token refresh.
  // Without this, a 401 on first load sets state=missing and never recovers
  // even after the token refreshes (ready/projectId don't change).
  const accessToken = useAuthStore((s) => s.accessToken);
  const [state, setState] = React.useState<VisionState>("loading");

  // recheckVision is called externally (e.g. after vision wizard completes)
  const [tick, setTick] = React.useState(0);
  const recheckVision = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    if (!ready || !projectId) {
      setState("loading");
      return;
    }

    const controller = new AbortController();
    setState("loading");

    getProjectVision(projectId, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        // Vision is only "exists" when setupComplete=true.
        // A file without setupComplete is an in-progress setup stub — still "missing".
        const vision = (res.data as any)?.data;
        setState(vision?.setupComplete === true ? "exists" : "missing");
      })
      .catch((err) => {
        if (controller.signal.aborted || axios.isCancel(err)) return;
        setState("missing");
      });

    return () => controller.abort();
  }, [ready, projectId, tick, accessToken]);

  return { visionState: state, recheckVision };
}
