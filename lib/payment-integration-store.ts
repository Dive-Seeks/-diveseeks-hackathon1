import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PaymentIntegrationState {
  isSubmitted: boolean;
  isPaymentIntegrated: boolean;
  isDismissedForSession: boolean;
  setSubmitted: (status: boolean) => void;
  setPaymentIntegrated: (status: boolean) => void;
  dismissForSession: () => void;
}

export const usePaymentIntegrationStore = create<PaymentIntegrationState>()(
  persist(
    (set) => ({
      isSubmitted: false,
      isPaymentIntegrated: false,
      isDismissedForSession: false,
      setSubmitted: (status) => set({ isSubmitted: status }),
      setPaymentIntegrated: (status) => set({ isPaymentIntegrated: status }),
      dismissForSession: () => set({ isDismissedForSession: true }),
    }),
    {
      name: "payment-integration-storage",
      // We only want to persist isSubmitted and isPaymentIntegrated across sessions.
      // isDismissedForSession could be reset on new session, but Zustand persist does local storage.
      // We'll use sessionStorage instead of localStorage if we only want it per session.
      // Or just persist all. Let's persist all for simplicity, or omit isDismissedForSession using partialize.
      partialize: (state) => ({
        isSubmitted: state.isSubmitted,
        isPaymentIntegrated: state.isPaymentIntegrated,
      }),
    },
  ),
);
