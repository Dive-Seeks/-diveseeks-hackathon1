import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

/** Project-wide API envelope */
interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface StoreImage {
  id: string;
  tenantId: string;
  storeId: string;
  fileName: string;
  originalName: string;
  ftpPath: string;
  ftpUrl: string;
  thumbnailUrl: string | null;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  tags: string[];
  usageCount: number;
  usedByProducts: string[];
  usedByCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GetStoreImagesResponse {
  images: StoreImage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadImageParams {
  storeId: string;
  file: File;
  tags?: string[];
}

// Fetch all store images
export function useStoreImages(
  storeId: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  },
) {
  return useQuery({
    queryKey: ['store-images', storeId, params],
    queryFn: async () => {
      const response = await api.get<ApiResponse<GetStoreImagesResponse>>(
        `/stores/${storeId}/images`,
        { params },
      );
      return response.data.data;
    },
    enabled: !!storeId,
  });
}

// Fetch critical images for prefetching
export function useCriticalImages(storeId: string) {
  return useQuery({
    queryKey: ['store-images', storeId, 'critical'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ images: StoreImage[] }>>(
        `/stores/${storeId}/images/critical`,
      );
      return response.data.data.images;
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch single image
export function useStoreImage(storeId: string, imageId: string) {
  return useQuery({
    queryKey: ['store-images', storeId, imageId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<StoreImage>>(
        `/stores/${storeId}/images/${imageId}`,
      );
      return response.data.data;
    },
    enabled: !!storeId && !!imageId,
  });
}

// Upload image mutation
export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, file, tags }: UploadImageParams) => {
      const formData = new FormData();
      formData.append('file', file);
      if (tags && tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const response = await api.post<ApiResponse<StoreImage>>(
        `/stores/${storeId}/images/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['store-images', variables.storeId],
      });
    },
  });
}

// Delete image mutation
export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, imageId }: { storeId: string; imageId: string }) => {
      const response = await api.delete<ApiResponse<unknown>>(
        `/stores/${storeId}/images/${imageId}`,
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['store-images', variables.storeId],
      });
    },
  });
}

export interface AssignImageParams {
  storeId: string;
  imageId: string;
  entityType: 'product' | 'category' | 'menu_item';
  entityId: string;
  previousImageId?: string;
}

// Assign image to a product, category, or menu item
export function useAssignImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storeId,
      imageId,
      entityType,
      entityId,
      previousImageId,
    }: AssignImageParams) => {
      const response = await api.patch<ApiResponse<StoreImage>>(
        `/stores/${storeId}/images/${imageId}/assign`,
        { entityType, entityId, previousImageId },
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['store-images', variables.storeId],
      });
    },
  });
}
