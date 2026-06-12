import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      // Don't retry on 4xx/5xx — only on network errors
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status && status >= 400) return false;
        return failureCount < 2;
      },
    },
  },
});
