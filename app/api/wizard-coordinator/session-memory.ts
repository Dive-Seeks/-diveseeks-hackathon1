export interface SessionMemory {
  sessionId: string;
  tenantId: string;
  siteId: string;
  createdAt: number;
  lastActiveAt: number;
  // Journey
  journey: 'new_menu' | 'existing_menu' | 'specific_request' | null;
  existingMenuSummary: {
    totalCategories: number;
    totalItems: number;
    itemsWithNoDescription: number;
    itemsWithNoModifiers: number;
    seoScore: number;
    topIssues: string[];
  } | null;
  // Discovered facts
  businessType: 'RESTAURANT' | 'CAFE' | 'BAR' | 'RETAIL';
  cuisines: string[];
  keywords: string[];
  dietaryType: string | null;
  spiceRange: string | null;
  serviceModel: string | null;
  allergenPolicy: string | null;
  // Hygiene
  hygieneChecked: boolean;
  hygieneRating: string | null;
  sharedKitchen: boolean | null;
  allergenNotice: boolean | null;
  // Wizard progress
  currentStep: 'detection' | 'discovery' | 'categories' | 'items' | 'modifiers' | 'seo' | 'complete';
  pendingApproval: PendingApproval | null;
  // Approved outputs
  approvedCategories: unknown[];
  approvedItems: unknown[];
  approvedModifiers: unknown[];
  globalAttributes: Record<string, string>;
  specialistCalls: Array<{ specialist: string; calledAt: number; summary: string }>;
}

export interface PendingApproval {
  specialist: 'zara' | 'marco' | 'kai' | 'rex' | 'sage';
  type: 'categories' | 'items' | 'modifiers' | 'attributes' | 'seo_fixes' | 'descriptions';
  suggestion: unknown;
  abigailIntro: string;
  askedAt: number;
}

const TTL_MS = 2 * 60 * 60 * 1000;
const store = new Map<string, SessionMemory>();

export function getSession(sessionId: string): SessionMemory | null {
  const s = store.get(sessionId);
  if (!s) return null;
  if (Date.now() - s.lastActiveAt > TTL_MS) { store.delete(sessionId); return null; }
  return s;
}

export function createSession(sessionId: string, tenantId: string, siteId: string, initial?: Partial<SessionMemory>): SessionMemory {
  const s: SessionMemory = {
    sessionId, tenantId, siteId,
    createdAt: Date.now(), lastActiveAt: Date.now(),
    journey: null, existingMenuSummary: null,
    businessType: 'RESTAURANT', cuisines: [], keywords: [],
    dietaryType: null, spiceRange: null, serviceModel: null, allergenPolicy: null,
    hygieneChecked: false,
    hygieneRating: null,
    sharedKitchen: null,
    allergenNotice: null,
    currentStep: 'detection',
    pendingApproval: null,
    approvedCategories: [], approvedItems: [], approvedModifiers: [],
    globalAttributes: {}, specialistCalls: [],
    ...initial,
  };
  store.set(sessionId, s);
  return s;
}

export function updateSession(sessionId: string, patch: Partial<SessionMemory>): SessionMemory | null {
  const s = store.get(sessionId);
  if (!s) return null;
  const updated = { ...s, ...patch, lastActiveAt: Date.now() };
  store.set(sessionId, updated);
  return updated;
}

export function deleteSession(sessionId: string): void { store.delete(sessionId); }

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of store.entries()) {
    if (now - s.lastActiveAt > TTL_MS) store.delete(id);
  }
}, 30 * 60 * 1000);
