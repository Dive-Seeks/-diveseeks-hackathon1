"use client";

import { useEffect } from "react";
import { initCacheSync } from "@/lib/cacheSync";

export function AppInitializer() {
  useEffect(() => {
    initCacheSync();
  }, []);

  return null;
}
