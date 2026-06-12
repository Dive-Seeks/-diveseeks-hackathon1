"use client";

import { useCoordinator } from "./useCoordinator";

export function useAiName(): string {
  const { coordinator } = useCoordinator();
  return coordinator?.name ?? "Abigail";
}
