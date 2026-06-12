'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface SpecialistDocument {
  id: string;
  specialistId: string;
  projectId: string;
  title: string;
  content: string;
  documentType: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> { data: T }

export function useSpecialistDocuments(projectId: string) {
  const qc = useQueryClient();
  const key = ['specialist-documents', projectId];

  const query = useQuery<Record<string, SpecialistDocument[]>>({
    queryKey: key,
    queryFn: async () => {
      const res = await api.get<ApiResponse<Record<string, SpecialistDocument[]>>>(
        `/specialist-documents/${projectId}`,
      );
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: (dto: { specialistId: string; title: string; content: string; documentType?: string }) =>
      api.post<ApiResponse<SpecialistDocument>>(`/specialist-documents/${projectId}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: ({ docId, dto }: { docId: string; dto: { title?: string; content?: string; documentType?: string } }) =>
      api.patch<ApiResponse<SpecialistDocument>>(`/specialist-documents/${projectId}/${docId}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: (docId: string) =>
      api.delete(`/specialist-documents/${projectId}/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    docsBySpecialist: query.data ?? {},
    isLoading: query.isLoading,
    isCreating: create.isPending,
    create: create.mutate,
    update: update.mutate,
    remove: remove.mutate,
  };
}
