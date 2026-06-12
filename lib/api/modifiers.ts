import api from '../api';

/**
 * Modifier API Client
 *
 * Handles all modifier-related API calls
 */

// ============ TYPES ============

export interface ModifierOption {
  id?: string;
  name: string;
  priceModifier: number; // In cents
  displayOrder: number;
  isDefault?: boolean;
  calories?: number;
  dietaryStatus?: 'halal' | 'non_halal' | 'vegetarian' | 'vegan';
  allergens?: string[];
  description?: string;
}

export interface Modifier {
  id: string;
  name: string;
  modifierType: 'single_select' | 'multi_select' | 'quantity' | 'text_input';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  displayOrder: number;
  description: string | null;
  icon: string | null;
  status: string;
  businessId: string;
  options: ModifierOption[];
  source: 'manual' | 'ai_generated' | 'template';
  templateId: string | null;
}

export interface ModifierTemplate {
  templateId: string;
  modifierSlug: string;
  name: string;
  type: 'single_select' | 'multi_select' | 'quantity' | 'text_input';
  categorySlug: string | null;
  businessType: string;
  isUniversal: boolean;
  icon: string | null;
  description: string | null;
  options: ModifierOption[];
  relevanceScore?: number;
  reasoning?: string;
  isRequired?: boolean;
}

export interface RecommendedBundle {
  modifiers: ModifierTemplate[];
  estimatedCompletionTime: string;
  comparableRestaurants: number;
}

export interface SuggestBundlesResponse {
  recommendedBundle: RecommendedBundle;
  allTemplates: ModifierTemplate[];
}

export interface StorePricing {
  storeId: string;
  priceModifier: number;
}

export interface StorePrice {
  modifierOptionId: string;
  storePrices: StorePricing[];
}

// ============ API CALLS ============

/**
 * Get AI-powered modifier bundle suggestions
 */
export async function suggestModifierBundles(params: {
  itemName: string;
  categorySlug?: string;
  businessType: 'RESTAURANT' | 'CAFE' | 'BAR' | 'RETAIL' | 'HYBRID';
  description?: string;
}): Promise<SuggestBundlesResponse> {
  const response = await api.post('/api/modifiers/ai/suggest-bundles', params);
  return response.data.data;
}

/**
 * Create a new modifier with options
 */
export async function createModifier(data: {
  name: string;
  modifierType: 'single_select' | 'multi_select' | 'quantity' | 'text_input';
  isRequired: boolean;
  minSelections: number;
  maxSelections: number | null;
  displayOrder: number;
  description?: string;
  icon?: string;
  businessId: string;
  options: Omit<ModifierOption, 'id'>[];
  source?: 'manual' | 'ai_generated' | 'template';
  templateId?: string;
}): Promise<Modifier> {
  const response = await api.post('/api/modifiers', data);
  return response.data.data;
}

/**
 * Get all modifiers for current business
 */
export async function getModifiers(): Promise<Modifier[]> {
  const response = await api.get('/api/modifiers');
  return response.data.data;
}

/**
 * Get a single modifier with options
 */
export async function getModifier(
  id: string,
  includeStorePricing = false
): Promise<Modifier> {
  const response = await api.get(`/api/modifiers/${id}`, {
    params: { includeStorePricing },
  });
  return response.data.data;
}

/**
 * Update a modifier
 */
export async function updateModifier(
  id: string,
  data: Partial<Modifier>
): Promise<Modifier> {
  const response = await api.put(`/api/modifiers/${id}`, data);
  return response.data.data;
}

/**
 * Delete a modifier
 */
export async function deleteModifier(id: string): Promise<Modifier> {
  const response = await api.delete(`/api/modifiers/${id}`);
  return response.data.data;
}

/**
 * Update store-specific pricing for modifier options
 */
export async function updateStorePricing(data: {
  options: StorePrice[];
}): Promise<void> {
  const response = await api.post('/api/modifiers/store-pricing', data);
  return response.data.data;
}

/**
 * Get store-specific pricing for a modifier option
 */
export async function getOptionStorePricing(
  optionId: string
): Promise<StorePricing[]> {
  const response = await api.get(
    `/api/modifiers/options/${optionId}/store-pricing`
  );
  return response.data.data;
}

/**
 * Link a modifier to a menu item
 */
export async function linkModifierToMenuItem(
  menuItemId: string,
  modifierId: string,
  displayOrder = 0
): Promise<void> {
  const response = await api.post(
    `/api/modifiers/menu-items/${menuItemId}/modifiers/${modifierId}`,
    null,
    { params: { displayOrder } }
  );
  return response.data.data;
}

/**
 * Unlink a modifier from a menu item
 */
export async function unlinkModifierFromMenuItem(
  menuItemId: string,
  modifierId: string
): Promise<void> {
  const response = await api.delete(
    `/api/modifiers/menu-items/${menuItemId}/modifiers/${modifierId}`
  );
  return response.data.data;
}

/**
 * Get all modifiers for a menu item
 */
export async function getMenuItemModifiers(
  menuItemId: string
): Promise<Modifier[]> {
  const response = await api.get(
    `/api/modifiers/menu-items/${menuItemId}/modifiers`
  );
  return response.data.data;
}
