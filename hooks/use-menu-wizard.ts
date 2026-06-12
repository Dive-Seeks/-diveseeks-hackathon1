"use client";

import { create } from "zustand";

// ============ Types ============

export interface CategorySuggestion {
  id: string;
  categorySlug: string;
  categoryName: string;
  icon: string | null;
  description: string | null;
  itemCountHint: number;
  isRecommended: boolean;
  businessType: string;
}

export interface WizardItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  dietaryStatus: string;
  categorySlug: string;
  requiredModifiers: string[];
  optionalModifiers: string[];
  tags: string[];
  source: "template" | "ai";
}

export interface ModifierOption {
  name: string;
  priceModifier: number;
  dietaryStatus?: string;
  isDefault?: boolean;
}

export interface AttributeSuggestion {
  attributeKey: 'dietary_type' | 'allergens' | 'spice_level' | 'meal_type' | 'preparation_method';
  attributeValue: string;
  label: string;
  icon: string;
  confidence: 'high' | 'medium' | 'low';
  scope: 'global' | 'item';
}

export interface ModifierGroup {
  id: string;
  modifierSlug: string;
  modifierName: string;
  modifierType: string;
  isRequired: boolean;
  icon: string | null;
  options: ModifierOption[];
  selected: boolean; // Whether this modifier group is included
}

export interface WizardCategory {
  id: string;
  categorySlug: string;
  categoryName: string;
  icon: string | null;
  description: string | null;
  selected: boolean;
  items: WizardItem[];
  modifiers: ModifierGroup[];
  itemsGenerated: boolean;
  isGenerating: boolean;
}

export type WizardStep =
  | "discovery"
  | "categories"
  | "menu-builder"
  | "review"
  | "apply";

interface MenuWizardState {
  // Wizard visibility
  isOpen: boolean;
  openWizard: () => void;
  closeWizard: () => void;

  // Current step
  currentStep: WizardStep;
  setStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1: Discovery
  businessDescription: string;
  setBusinessDescription: (desc: string) => void;
  detectedBusinessType: string;
  detectedKeywords: string[];
  aiMessage: string;
  setDiscoveryResult: (result: {
    detectedBusinessType: string;
    detectedKeywords: string[];
    aiMessage: string;
    suggestedCategories: CategorySuggestion[];
  }) => void;
  isDiscovering: boolean;
  setIsDiscovering: (v: boolean) => void;

  // Step 2: Categories
  categories: WizardCategory[];
  toggleCategory: (id: string) => void;
  selectedCategoryCount: () => number;

  // Step 3: Menu Builder
  setCategoryItems: (categorySlug: string, items: WizardItem[]) => void;
  setCategoryGenerating: (categorySlug: string, generating: boolean) => void;
  setCategoryModifiers: (categorySlug: string, modifiers: ModifierGroup[]) => void;
  updateItem: (categorySlug: string, itemId: string, updates: Partial<WizardItem>) => void;
  removeItem: (categorySlug: string, itemId: string) => void;
  addItem: (categorySlug: string, item: WizardItem) => void;
  toggleModifier: (categorySlug: string, modifierSlug: string) => void;

  // Step 5: Apply
  selectedStoreIds: string[];
  toggleStore: (storeId: string) => void;
  setSelectedStores: (ids: string[]) => void;

  // Summary
  totalItemCount: () => number;
  totalModifierCount: () => number;

  // Discovery Chat History
  chatHistory: { role: "ai" | "user"; text: string }[];
  addChatMessage: (msg: { role: "ai" | "user"; text: string }) => void;

  // Global Attributes
  globalAttributes: Record<string, string>;
  setGlobalAttribute: (key: string, value: string) => void;
  clearGlobalAttribute: (key: string) => void;
  clearAllGlobalAttributes: () => void;

  // Pending attribute suggestions (from AI, shown as badges in chat)
  pendingAttributeSuggestions: AttributeSuggestion[];
  pendingAttributeMessage: string;
  setPendingAttributes: (suggestions: AttributeSuggestion[], message: string) => void;
  clearPendingAttributes: () => void;

  // Per-item attribute overrides
  itemAttributeOverrides: Record<string, Record<string, string>>;
  setItemAttribute: (itemId: string, key: string, value: string) => void;
  clearItemAttribute: (itemId: string, key: string) => void;

  // Reset
  resetWizard: () => void;
}

const STEP_ORDER: WizardStep[] = [
  "discovery",
  "categories",
  "menu-builder",
  "review",
  "apply",
];

export const useMenuWizardStore = create<MenuWizardState>((set, get) => ({
  // Visibility
  isOpen: false,
  openWizard: () => set({ isOpen: true }),
  closeWizard: () => set({ isOpen: false }),

  // Current step
  currentStep: "discovery",
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx < STEP_ORDER.length - 1) set({ currentStep: STEP_ORDER[idx + 1] });
  },
  prevStep: () => {
    const idx = STEP_ORDER.indexOf(get().currentStep);
    if (idx > 0) set({ currentStep: STEP_ORDER[idx - 1] });
  },

  // Step 1
  businessDescription: "",
  setBusinessDescription: (desc) => set({ businessDescription: desc }),
  detectedBusinessType: "",
  detectedKeywords: [],
  aiMessage: "",
  setDiscoveryResult: (result) =>
    set({
      detectedBusinessType: result.detectedBusinessType,
      detectedKeywords: result.detectedKeywords,
      aiMessage: result.aiMessage || "Discovery completed successfully!",
      categories: (result.suggestedCategories || []).map((cat) => ({
        id: cat.id,
        categorySlug: cat.categorySlug,
        categoryName: cat.categoryName,
        icon: cat.icon,
        description: cat.description,
        selected: cat.isRecommended,
        items: [],
        modifiers: [],
        itemsGenerated: false,
        isGenerating: false,
      })),
    }),
  isDiscovering: false,
  setIsDiscovering: (v) => set({ isDiscovering: v }),

  // Step 2
  categories: [],
  toggleCategory: (id) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, selected: !c.selected } : c
      ),
    })),
  selectedCategoryCount: () => get().categories.filter((c) => c.selected).length,

  // Step 3
  setCategoryItems: (categorySlug, items) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? { ...c, items, itemsGenerated: true, isGenerating: false }
          : c
      ),
    })),
  setCategoryGenerating: (categorySlug, generating) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug ? { ...c, isGenerating: generating } : c
      ),
    })),
  setCategoryModifiers: (categorySlug, modifiers) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? { ...c, modifiers: modifiers.map((m) => ({ ...m, selected: m.isRequired })) }
          : c
      ),
    })),
  updateItem: (categorySlug, itemId, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? {
              ...c,
              items: c.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : c
      ),
    })),
  removeItem: (categorySlug, itemId) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? { ...c, items: c.items.filter((item) => item.id !== itemId) }
          : c
      ),
    })),
  addItem: (categorySlug, item) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? { ...c, items: [...c.items, item] }
          : c
      ),
    })),
  toggleModifier: (categorySlug, modifierSlug) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.categorySlug === categorySlug
          ? {
              ...c,
              modifiers: c.modifiers.map((m) =>
                m.modifierSlug === modifierSlug
                  ? { ...m, selected: !m.selected }
                  : m
              ),
            }
          : c
      ),
    })),

  // Step 5
  selectedStoreIds: [],
  toggleStore: (storeId) =>
    set((state) => ({
      selectedStoreIds: state.selectedStoreIds.includes(storeId)
        ? state.selectedStoreIds.filter((id) => id !== storeId)
        : [...state.selectedStoreIds, storeId],
    })),
  setSelectedStores: (ids) => set({ selectedStoreIds: ids }),

  // Summary
  totalItemCount: () =>
    get()
      .categories.filter((c) => c.selected)
      .reduce((sum, c) => sum + c.items.length, 0),
  totalModifierCount: () =>
    get()
      .categories.filter((c) => c.selected)
      .reduce((sum, c) => sum + c.modifiers.filter((m) => m.selected).length, 0),

  // Discovery Chat
  chatHistory: [
    {
      role: "ai",
      text: `👋 Hi! I'm **Abigail**, your AI menu assistant. Tell me about your business — what type of food do you serve?\n\nFor example: *"We're a takeaway selling pizza, burgers, and fried chicken"*`,
    },
  ],
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),

  // Global Attributes
  globalAttributes: {},
  setGlobalAttribute: (key, value) =>
    set((state) => ({ globalAttributes: { ...state.globalAttributes, [key]: value } })),
  clearGlobalAttribute: (key) =>
    set((state) => {
      const next = { ...state.globalAttributes };
      delete next[key];
      return { globalAttributes: next };
    }),
  clearAllGlobalAttributes: () => set({ globalAttributes: {} }),

  // Pending suggestions
  pendingAttributeSuggestions: [],
  pendingAttributeMessage: '',
  setPendingAttributes: (suggestions, message) =>
    set({ pendingAttributeSuggestions: suggestions, pendingAttributeMessage: message }),
  clearPendingAttributes: () =>
    set({ pendingAttributeSuggestions: [], pendingAttributeMessage: '' }),

  // Item attribute overrides
  itemAttributeOverrides: {},
  setItemAttribute: (itemId, key, value) =>
    set((state) => ({
      itemAttributeOverrides: {
        ...state.itemAttributeOverrides,
        [itemId]: { ...(state.itemAttributeOverrides[itemId] ?? {}), [key]: value },
      },
    })),
  clearItemAttribute: (itemId, key) =>
    set((state) => {
      const overrides = { ...state.itemAttributeOverrides };
      if (overrides[itemId]) {
        overrides[itemId] = { ...overrides[itemId] };
        delete overrides[itemId][key];
      }
      return { itemAttributeOverrides: overrides };
    }),

  // Reset
  resetWizard: () =>
    set({
      currentStep: "discovery",
      businessDescription: "",
      detectedBusinessType: "",
      detectedKeywords: [],
      aiMessage: "",
      categories: [],
      selectedStoreIds: [],
      isDiscovering: false,
      chatHistory: [
        {
          role: "ai",
          text: `👋 Hi! I'm **Abigail**, your AI menu assistant. Tell me about your business — what type of food do you serve?\n\nFor example: *"We're a takeaway selling pizza, burgers, and fried chicken"*`,
        },
      ],
      globalAttributes: {},
      pendingAttributeSuggestions: [],
      pendingAttributeMessage: '',
      itemAttributeOverrides: {},
    }),
}));
