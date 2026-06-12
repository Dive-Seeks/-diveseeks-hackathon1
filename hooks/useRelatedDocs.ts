'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export interface DocSummary {
  id: string;
  specialistId: string;
  title: string;
  content: string;
  documentType: string;
}

export function useRelatedDocs(projectId: string, docId: string | null) {
  const { isAuthenticated } = useAuthStore();
  return useQuery<DocSummary[]>({
    queryKey: ['related-docs', projectId, docId],
    queryFn: async () => {
      const res = await api.get(`/specialist-documents/${projectId}/docs/${docId}/related`);
      return (res.data.data ?? []) as DocSummary[];
    },
    enabled: !!docId && !!projectId && isAuthenticated,
    staleTime: 60_000,
  });
}
