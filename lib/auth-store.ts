import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  role: string;
  isCoder: boolean;
  isBusiness: boolean;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        console.log("AuthStore: Setting auth state", { userId: user.id });
        try {
          document.cookie = `isAuthenticated=true; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `isCoder=${user.isCoder}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `isBusiness=${user.isBusiness}; path=/; max-age=604800; SameSite=Lax`;
          console.log("AuthStore: Cookies set successfully");
        } catch (e) {
          console.error("AuthStore: Error setting cookies", e);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },
      logout: () => {
        console.log("AuthStore: Logging out");
        // Remove cookies
        try {
          document.cookie = "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
          document.cookie = "isCoder=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
          document.cookie = "isBusiness=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
          console.log("AuthStore: Cookies removed successfully");
        } catch (e) {
          console.error("AuthStore: Error removing cookies", e);
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: "auth-storage",

      onRehydrateStorage: () => (state) => {
        console.log("AuthStore: Rehydrating storage");
        state?.setHydrated(true);
      },
    },
  ),
);
