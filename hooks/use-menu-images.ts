import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface GeneratedImage {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  itemName: string;
  cuisineType: string;
  businessType: string;
  sourceMode: 'text' | 'single_photo' | 'two_photos';
  sourceImageUrl: string | null;
  styleRefImageUrl: string | null;
  promptJson: Record<string, unknown> | null;
  dallePrompt: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  approvalStatus: 'pending' | 'analyzing' | 'generating' | 'completed' | 'approved' | 'rejected' | 'failed';
  isGlobal: boolean;
  generationModel: string;
  generationCost: number;
  usageCount: number;
  errorMessage: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export function useMenuImages(tenantId?: string) {
  return useQuery<GeneratedImage[]>({
    queryKey: ['menu-images', tenantId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<GeneratedImage[]>>('/menu-images');
      return response.data.data;
    },
    enabled: !!tenantId,
  });
}

export function useSearchMenuImages(query: string, enabled: boolean) {
  return useQuery<GeneratedImage[]>({
    queryKey: ['menu-images', 'search', query],
    queryFn: async () => {
      const response = await api.get<ApiResponse<GeneratedImage[]>>(
        `/menu-images/search`,
        { params: { q: query, limit: 6 } },
      );
      return response.data.data;
    },
    enabled: enabled && query.length > 0,
    staleTime: 30000,
  });
}

export function useMenuImageStatus(imageId: string | null) {
  return useQuery<GeneratedImage>({
    queryKey: ['menu-images', imageId, 'status'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<GeneratedImage>>(
        `/menu-images/${imageId}/status`,
      );
      return response.data.data;
    },
    enabled: !!imageId,
    refetchInterval: (query) => {
      const status = query.state.data?.approvalStatus;
      if (status === 'pending' || status === 'analyzing' || status === 'generating') {
        return 2000;
      }
      return false;
    },
  });
}

export interface GenerateImageParams {
  itemName: string;
  cuisineType?: string;
  businessType?: string;
  preset?: string;
  sourceMode?: 'text' | 'single_photo' | 'two_photos';
  storeId?: string;
  sourceImage?: File;
  styleRefImage?: File;
}

export function useGenerateMenuImage() {
  const queryClient = useQueryClient();

  return useMutation<
    { jobId: string; imageId: string },
    Error,
    GenerateImageParams
  >({
    mutationFn: async (params) => {
      const formData = new FormData();
      formData.append('itemName', params.itemName);
      if (params.cuisineType) formData.append('cuisineType', params.cuisineType);
      if (params.businessType) formData.append('businessType', params.businessType);
      if (params.preset) formData.append('preset', params.preset);
      if (params.sourceMode) formData.append('sourceMode', params.sourceMode);
      if (params.storeId) formData.append('storeId', params.storeId);
      if (params.sourceImage) formData.append('sourceImage', params.sourceImage);
      if (params.styleRefImage) formData.append('styleRefImage', params.styleRefImage);

      const response = await api.post<ApiResponse<{ jobId: string; imageId: string }>>(
        '/menu-images/generate',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-images'] });
    },
  });
}

export function useApproveMenuImage() {
  const queryClient = useQueryClient();

  return useMutation<GeneratedImage, Error, string>({
    mutationFn: async (imageId) => {
      const response = await api.patch<ApiResponse<GeneratedImage>>(
        `/menu-images/${imageId}/approve`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-images'] });
    },
  });
}

export function useRejectMenuImage() {
  const queryClient = useQueryClient();

  return useMutation<GeneratedImage, Error, string>({
    mutationFn: async (imageId) => {
      const response = await api.patch<ApiResponse<GeneratedImage>>(
        `/menu-images/${imageId}/reject`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-images'] });
    },
  });
}
