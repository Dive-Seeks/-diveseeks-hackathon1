"use client";

import * as React from "react";
import Link from "next/link";
import { KeyRoundIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import api from "@/lib/api";

export function LlmKeyAlert() {
  const { accessToken, isHydrated } = useAuthStore();
  const [show, setShow] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (!isHydrated || !accessToken || dismissed) return;
    api.get("/ai-integration/config?context=coding")
      .then((res) => {
        const d = res.data?.data;
        const configured = d?.configured && (d?.hasOpenai || d?.hasGroq || d?.hasOpenRouter || d?.hasGoogle);
        setShow(!configured);
      })
      .catch(() => {});
  }, [isHydrated, accessToken, dismissed]);

  if (!show || dismissed) return null;

  return (
    <div className="border-b-2 border-amber-500/30 bg-amber-500/10">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 border border-amber-500/30">
          <KeyRoundIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-none mb-0.5">
            LLM key not configured
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Abigail and its specialists can&apos;t help you until you add your API key.
          </p>
        </div>
        <Link
          href="/coding/settings/llm"
          className="flex items-center gap-1.5 shrink-0 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
        >
          Set up LLM key
          <ArrowRightIcon className="size-3.5" />
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-600/60 hover:text-amber-700 dark:text-amber-400/60 dark:hover:text-amber-300 transition-colors"
          aria-label="Dismiss"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}
