import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  suggestModifierBundles,
  createModifier,
  getModifiers,
  getModifier,
  updateModifier,
  deleteModifier,
  updateStorePricing,
  linkModifierToMenuItem,
  unlinkModifierFromMenuItem,
  getMenuItemModifiers,
  type SuggestBundlesResponse,
  type Modifier,
  type StorePrice,
} from '@/lib/api/modifiers';

// ============ QUERY KEYS ============

export const modifierKeys = {
  all: ['modifiers'] as const,
  lists: () => [...modifierKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...modifierKeys.lists(), { filters }] as const,
  details: () => [...modifierKeys.all, 'detail'] as const,
  detail: (id: string) => [...modifierKeys.details(), id] as const,
  suggestions: (params: {
    itemName: string;
    categorySlug?: string;
    businessType: string;
  }) => [...modifierKeys.all, 'suggestions', params] as const,
  menuItem: (menuItemId: string) =>
    [...modifierKeys.all, 'menuItem', menuItemId] as const,
};

// ============ QUERIES ============

/**
 * Get AI-powered modifier suggestions
 */
export function useModifierSuggestions(params: {
  itemName: string;
  categorySlug?: string;
  businessType: 'RESTAURANT' | 'CAFE' | 'BAR' | 'RETAIL' | 'HYBRID';
  description?: string;
  enabled?: boolean;
}) {
  return useQuery<SuggestBundlesResponse>({
    queryKey: modifierKeys.suggestions(params),
    queryFn: () => suggestModifierBundles(params),
    enabled: params.enabled !== false && !!params.itemName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get all modifiers for current business
 */
export function useModifiers() {
  return useQuery<Modifier[]>({
    queryKey: modifierKeys.lists(),
    queryFn: getModifiers,
  });
}

/**
 * Get a single modifier
 */
export function useModifier(id: string, includeStorePricing = false) {
  return useQuery<Modifier>({
    queryKey: modifierKeys.detail(id),
    queryFn: () => getModifier(id, includeStorePricing),
    enabled: !!id,
  });
}

/**
 * Get modifiers for a menu item
 */
export function useMenuItemModifiers(menuItemId: string) {
  return useQuery<Modifier[]>({
    queryKey: modifierKeys.menuItem(menuItemId),
    queryFn: () => getMenuItemModifiers(menuItemId),
    enabled: !!menuItemId,
  });
}

// ============ MUTATIONS ============

/**
 * Create a new modifier
 */
export function useCreateModifier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createModifier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modifierKeys.lists() });
    },
  });
}

/**
 * Update a modifier
 */
export function useUpdateModifier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Modifier> }) =>
      updateModifier(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: modifierKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: modifierKeys.lists() });
    },
  });
}

/**
 * Delete a modifier
 */
export function useDeleteModifier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteModifier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modifierKeys.lists() });
    },
  });
}

/**
 * Update store-specific pricing
 */
export function useUpdateStorePricing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { options: StorePrice[] }) => updateStorePricing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modifierKeys.all });
    },
  });
}

/**
 * Link modifier to menu item
 */
export function useLinkModifierToMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      modifierId,
      displayOrder,
    }: {
      menuItemId: string;
      modifierId: string;
      displayOrder?: number;
    }) => linkModifierToMenuItem(menuItemId, modifierId, displayOrder),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: modifierKeys.menuItem(variables.menuItemId),
      });
    },
  });
}

/**
 * Unlink modifier from menu item
 */
export function useUnlinkModifierFromMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      menuItemId,
      modifierId,
    }: {
      menuItemId: string;
      modifierId: string;
    }) => unlinkModifierFromMenuItem(menuItemId, modifierId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: modifierKeys.menuItem(variables.menuItemId),
      });
    },
  });
}
