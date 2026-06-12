import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BusinessContextState {
  activeBusinessId: string | null;
  activeSiteId: string | null; // Channel
  activeStoreId: string | null; // Location
  
  setActiveBusinessId: (id: string | null) => void;
  setActiveSiteId: (id: string | null) => void;
  setActiveStoreId: (id: string | null) => void;
  
  resetContext: () => void;
}

export const useBusinessContextStore = create<BusinessContextState>()(
  persist(
    (set) => ({
      activeBusinessId: null,
      activeSiteId: null,
      activeStoreId: null,

      setActiveBusinessId: (id) => set({ activeBusinessId: id }),
      setActiveSiteId: (id) => set({ activeSiteId: id }),
      setActiveStoreId: (id) => set({ activeStoreId: id }),
      
      resetContext: () => set({ activeBusinessId: null, activeSiteId: null, activeStoreId: null }),
    }),
    {
      name: 'business-context-storage',
    }
  )
);
