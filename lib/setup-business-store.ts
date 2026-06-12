import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Director {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  residentialAddress: Address;
  email: string;
  phone: string;
}

export interface Address {
  street: string;
  locality: string;
  region: string;
  postalCode: string;
}

export interface BusinessBasics {
  region: string;
  businessName: string;
  companyName: string;
  businessType: string;
  registeredAddress: Address;
  registrationNumber?: string;
  companyEmail: string;
  companyPhone: string;
  primaryStore?: {
    name: string;
    address: Address;
    placeId?: string;
  };
}

export interface BankDetails {
  [key: string]: string;
}

export interface DaySlot {
  day: string;
  openTime: string;
  closeTime: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Warehouse {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface HolidayException {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface StoreInformation {
  placeId?: string;
  storeName: string; // Changed from siteName to storeName
  storeAddress: Address;
  currency: string;
  businessType:
    | "Restaurant"
    | "Take-away"
    | "Store"
    | "E-commerce"
    | "Retail"
    | "Hospitality"
    | "Healthcare"
    | "Professional Services"
    | "Non-Profit"
    | "Education"
    | "Manufacturing"
    | "Construction"
    | "Logistics"
    | "Others";
  otherBusinessType?: string;
  is24_7: boolean;
  selectedDays: string[];
  dailyTimeSlots: DaySlot[];
  holidays: Holiday[];
  holidayExceptions: HolidayException[];
  warehouse?: Warehouse;
  selectedChannels: ("pos" | "web" | "mobile" | "marketplace")[];
}

interface SetupBusinessState {
  currentStep: number;
  businessBasics: BusinessBasics;
  directors: Director[];
  bankDetails: BankDetails;
  storeInformation: StoreInformation;
  businessId: string | null;
  status: "UNSAVED" | "SAVED" | "SUBMITTED" | "PENDING" | "ACTIVE" | null;
  lastSaved: string | null;
  saveStatus: "idle" | "saving" | "success" | "error";
  isHydrated: boolean;
  isDev: boolean;
  setStep: (step: number) => void;
  setBusinessId: (id: string | null) => void;
  setBusinessBasics: (basics: Partial<BusinessBasics>) => void;
  setDirectors: (directors: Director[]) => void;
  addDirector: (director: Director) => void;
  removeDirector: (id: string) => void;
  updateDirector: (id: string, director: Partial<Director>) => void;
  setBankDetails: (details: BankDetails) => void;
  setStoreInformation: (info: Partial<StoreInformation>) => void;
  setSaveStatus: (status: "idle" | "saving" | "success" | "error") => void;
  setLastSaved: (time: string | null) => void;
  setStatus: (
    status: "UNSAVED" | "SAVED" | "SUBMITTED" | "PENDING" | "ACTIVE" | null,
  ) => void;
  setFullState: (state: Partial<SetupBusinessState>) => void;
  reset: () => void;
  setHydrated: (state: boolean) => void;
  detectRegion: () => Promise<void>;
}

const initialBasics: BusinessBasics = {
  region: "",
  businessName: "",
  companyName: "",
  businessType: "",
  registeredAddress: {
    street: "",
    locality: "",
    region: "",
    postalCode: "",
  },
  registrationNumber: "",
  companyEmail: "",
  companyPhone: "",
  primaryStore: {
    name: "",
    address: {
      street: "",
      locality: "",
      region: "",
      postalCode: "",
    },
    placeId: "",
  },
};

const initialBankDetails: BankDetails = {};

const initialStoreInformation: StoreInformation = {
  placeId: "",
  storeName: "", // Changed from siteName to storeName
  storeAddress: {
    street: "",
    locality: "",
    region: "",
    postalCode: "",
  },
  currency: "",
  businessType: "Restaurant",
  is24_7: false,
  selectedDays: [],
  dailyTimeSlots: [],
  holidays: [],
  holidayExceptions: [],
  selectedChannels: ["pos"],
};

interface PersistedSetupBusinessState {
  currentStep: number;
  businessBasics: BusinessBasics;
  directors: Director[];
  bankDetails: BankDetails;
  storeInformation: StoreInformation;
  businessId: string | null;
  isHydrated: boolean;
}

export const useSetupBusinessStore = create<SetupBusinessState>()(
  persist(
    (set) => ({
      currentStep: 1,
      businessBasics: initialBasics,
      directors: [],
      bankDetails: initialBankDetails,
      storeInformation: initialStoreInformation,
      businessId: null,
      status: null,
      lastSaved: null,
      saveStatus: "idle",
      isHydrated: false,
      isDev: process.env.NODE_ENV === "development",
      setStep: (step) => set({ currentStep: step }),
      setBusinessId: (id) => set({ businessId: id }),
      setBusinessBasics: (basics) =>
        set((state) => ({
          businessBasics: { ...state.businessBasics, ...basics },
        })),
      setDirectors: (directors) => set({ directors }),
      addDirector: (director) =>
        set((state) => ({
          directors: [...state.directors, director],
        })),
      removeDirector: (id) =>
        set((state) => ({
          directors: state.directors.filter((d) => d.id !== id),
        })),
      updateDirector: (id, updatedDirector) =>
        set((state) => ({
          directors: state.directors.map((d) =>
            d.id === id ? { ...d, ...updatedDirector } : d,
          ),
        })),
      setBankDetails: (details) => set({ bankDetails: details }),
      setStoreInformation: (info) =>
        set((state) => ({
          storeInformation: { ...state.storeInformation, ...info },
        })),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      setLastSaved: (lastSaved) => set({ lastSaved }),
      setStatus: (status) => set({ status }),
      setFullState: (newState) => set((state) => ({ ...state, ...newState })),
      reset: () =>
        set({
          currentStep: 1,
          businessBasics: initialBasics,
          directors: [],
          bankDetails: initialBankDetails,
          storeInformation: initialStoreInformation,
          businessId: null,
          status: null,
          lastSaved: null,
          saveStatus: "idle",
        }),
      setHydrated: (state) => set({ isHydrated: state }),
      detectRegion: async () => {
        const { businessBasics } =
          useSetupBusinessStore.getState() as SetupBusinessState;
        if (businessBasics.region) return;

        try {
          // Mocking IP geolocation
          // In a real app, you would call an API like https://ipapi.co/json/
          const mockGeoResponse = { country_name: "United Kingdom" };

          set((state) => ({
            businessBasics: {
              ...state.businessBasics,
              region: mockGeoResponse.country_name,
            },
          }));
        } catch (error) {
          console.error("Failed to detect region:", error);
        }
      },
    }),
    {
      name: "setup-business-storage",
      version: 6,
      migrate: (persistedState: unknown, version: number) => {
        // Use a generic record for state during migration to avoid 'any'
        const state = persistedState as Record<string, unknown>;

        if (version === 0) {
          // Migration from version 0 to 1: Handle string addresses
          const businessBasics = state.businessBasics as
            | Record<string, unknown>
            | undefined;
          if (
            businessBasics &&
            typeof businessBasics.registeredAddress === "string"
          ) {
            const oldAddress = businessBasics.registeredAddress;
            businessBasics.registeredAddress = {
              street: oldAddress,
              locality: "",
              region: "",
              postalCode: "",
            };
          }

          const directors = state.directors as
            | Array<Record<string, unknown>>
            | undefined;
          if (Array.isArray(directors)) {
            state.directors = directors.map((d) => {
              if (typeof d.residentialAddress === "string") {
                const oldAddress = d.residentialAddress;
                return {
                  ...d,
                  residentialAddress: {
                    street: oldAddress,
                    locality: "",
                    region: "",
                    postalCode: "",
                  },
                };
              }
              return d;
            });
          }
        }

        if (version === 1) {
          // Migration from version 1 to 2: Split fullName to firstName/lastName and remove nationality
          const directors = state.directors as
            | Array<Record<string, unknown>>
            | undefined;
          if (Array.isArray(directors)) {
            state.directors = directors.map((d) => {
              const fullName = d.fullName as string | undefined;
              const rest = { ...d };
              delete rest.fullName;
              delete rest.nationality;

              const nameParts = (fullName || "").trim().split(/\s+/);
              const firstName = nameParts[0] || "";
              const lastName = nameParts.slice(1).join(" ") || "";
              return {
                ...rest,
                firstName,
                lastName,
              };
            });
          }
        }

        if (version === 2) {
          // Migration from version 2 to 3: Add bankDetails
          if (!state.bankDetails) {
            state.bankDetails = {};
          }
        }

        if (version === 3) {
          // Migration from version 3 to 4: Add StoreInformation or ensure its fields exist
          if (!state.storeInformation) {
            state.storeInformation = {
              siteName: "",
              storeAddress: {
                street: "",
                locality: "",
                region: "",
                postalCode: "",
              },
              currency: "",
              openingTime: "",
              closingTime: "",
              workingHoursStatement: "",
            };
          } else {
            // If StoreInformation exists, ensure storeAddress is initialized
            const siteInfo = state.storeInformation as Record<string, unknown>;
            if (!siteInfo.storeAddress) {
              siteInfo.storeAddress = {
                street: "",
                locality: "",
                region: "",
                postalCode: "",
              };
            }
          }
        }

        if (version === 4) {
          // Migration from version 4 to 5: Overhaul StoreInformation
          if (state.storeInformation) {
            const oldInfo = state.storeInformation as Record<string, unknown>;
            state.storeInformation = {
              storeName: oldInfo.siteName || oldInfo.storeName || "", // Handle migration from siteName to storeName
              storeAddress: oldInfo.storeAddress || {
                street: "",
                locality: "",
                region: "",
                postalCode: "",
              },
              currency: oldInfo.currency || "",
              businessType: "Restaurant",
              is24_7: false,
              selectedDays: [],
              dailyTimeSlots: [],
              holidays: [],
            };
          }
        }

        if (version === 5) {
          // Migration from version 5 to 6: Add status, lastSaved, saveStatus
          if (!state.status) state.status = null;
          if (!state.lastSaved) state.lastSaved = null;
          if (!state.saveStatus) state.saveStatus = "idle";
        }

        return state as unknown as PersistedSetupBusinessState;
      },

      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
