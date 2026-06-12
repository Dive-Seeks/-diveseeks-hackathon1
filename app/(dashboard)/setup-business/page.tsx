"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSetupBusinessStore,
  Director,
  BusinessBasics,
  BankDetails,
  StoreInformation,
} from "@/lib/setup-business-store";
import { RegionSelect } from "@/components/setup-business/RegionSelect";
import { BusinessTypeSelect } from "@/components/setup-business/BusinessTypeSelect";
import { AddressInput } from "@/components/setup-business/AddressInput";
import { DirectorForm } from "@/components/setup-business/DirectorForm";
import { BankDetailsForm } from "@/components/setup-business/BankDetailsForm";
import { StoreInformationForm } from "@/components/setup-business/StoreInformationForm";
import {
  SalesChannelSelector,
  type SalesChannelValue,
} from "@/components/setup-business/SalesChannelSelector";
import { HolidayExceptionsSummary } from "@/components/setup-business/HolidayExceptionsSummary";
import {
  CompanyLookup,
  CompanyLookupOption,
} from "@/components/setup-business/CompanyLookup";
import {
  PlaceLookup,
  PlaceLookupOption,
} from "@/components/setup-business/PlaceLookup";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckIcon,
  Loader2Icon,
} from "lucide-react";
import api from "@/lib/api";
import { extractApiError } from "@/lib/api/errors";
import { useQueryClient } from "@tanstack/react-query";
import {
  validateEmail,
  validatePhone,
  validateDOB,
  validateStructuredAddress,
  validateRegNumber,
  validateBankDetails,
  hasHolidayOverlap,
} from "@/lib/validation";
import { getPhoneInfo } from "@/lib/region-service";
import { decrypt, maskSensitiveData } from "@/lib/crypto";
import { AxiosError } from "axios";
import { cn } from "@/lib/utils";
import { buildSetupCompletionReport } from "@/lib/setup-business-completion";

type StepData = BusinessBasics | Director[] | BankDetails | StoreInformation;
type SetupBusinessApiResponse = {
  id: string;
  name?: string;
  companyName?: string;
  businessType?: string;
  registrationNumber?: string;
  companyEmail?: string;
  companyPhone?: string;
  region?: string;
  registeredAddress?: {
    street?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
  } | null;
  directors?: Array<{
    id?: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    email?: string;
    phone?: string;
    residentialAddress?: {
      street?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
    } | null;
  }>;
  stores?: Array<{
    id?: string;
    name?: string;
    placeId?: string;
    currency?: string;
    businessType?: StoreInformation["businessType"];
    is_24_7?: boolean;
    storeAddress?: {
      street?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
    } | null;
    operatingHours?: Array<{
      day?: string;
      open_time?: string;
      close_time?: string;
    }>;
    holidays?: Array<{
      id?: string;
      name?: string;
      date?: string;
      is_closed?: boolean;
      open_time?: string | null;
      close_time?: string | null;
    }>;
  }>;
  sites?: SetupBusinessApiResponse["stores"];
};

type BankDetailsApiResponse = {
  decryptedPayload?: Record<string, string>;
};

type CompanyDirectorApi = {
  name?: string;
  dateOfBirth?: {
    year?: number;
    month?: number;
  };
};

const UK_POSTCODE_REGEX = /\b([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})\b/i;

const looksLikeEncryptedValue = (value: string) =>
  /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 24;

const normalizePostcode = (value: string) => {
  const match = value.match(UK_POSTCODE_REGEX);
  if (!match) {
    return "";
  }
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
};

const normalizeDobToUkFormat = (dob: string | null | undefined): string => {
  const value = (dob ?? "").trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
};

const STREET_KEYWORDS = new Set([
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "lane",
  "ln",
  "drive",
  "dr",
  "close",
  "court",
  "crescent",
  "terrace",
  "way",
  "boulevard",
  "blvd",
  "hill",
]);

const looksLikeStreetSegment = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (/^\d+/.test(normalized)) {
    return true;
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1];
  return STREET_KEYWORDS.has(lastWord);
};

const looksLikeBusinessName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    !looksLikeStreetSegment(normalized) && !UK_POSTCODE_REGEX.test(normalized)
  );
};

const parseSelectedPlace = (
  description: string,
  fallbackRegion: string,
  fallbackPostalCode: string,
) => {
  const parts = description
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const countryCodes = new Set(["uk", "united kingdom"]);
  const withoutCountry =
    parts.length > 1 && countryCodes.has(parts[parts.length - 1].toLowerCase())
      ? parts.slice(0, -1)
      : parts;

  const postcode = normalizePostcode(description) || fallbackPostalCode;
  const businessName = looksLikeBusinessName(withoutCountry[0] || "")
    ? withoutCountry[0]
    : description;

  let street = withoutCountry[0] || description;
  if (
    withoutCountry.length >= 2 &&
    looksLikeBusinessName(withoutCountry[0]) &&
    looksLikeStreetSegment(withoutCountry[1])
  ) {
    street = `${withoutCountry[0]}, ${withoutCountry[1]}`;
  }

  let locality = "";
  let region = fallbackRegion;
  const lastSegment = withoutCountry[withoutCountry.length - 1] || "";
  const cleanedLastSegment = lastSegment
    .replace(UK_POSTCODE_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
  const prevSegment = withoutCountry[withoutCountry.length - 2] || "";

  if (withoutCountry.length >= 4 && normalizePostcode(lastSegment)) {
    locality = prevSegment;
    region = cleanedLastSegment || fallbackRegion;
  } else if (normalizePostcode(lastSegment)) {
    locality =
      cleanedLastSegment ||
      (looksLikeStreetSegment(prevSegment) ? "" : prevSegment);
  } else if (withoutCountry.length >= 3) {
    locality = withoutCountry[withoutCountry.length - 2] || "";
    region = withoutCountry[withoutCountry.length - 1] || fallbackRegion;
  } else if (withoutCountry.length === 2) {
    locality = withoutCountry[1] || "";
  }

  return {
    businessName,
    companyName: businessName,
    street,
    locality,
    region,
    postalCode: postcode,
  };
};

export default function SetupBusinessPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    currentStep,
    businessBasics,
    directors,
    bankDetails,
    storeInformation,
    businessId,
    setStep,
    setBusinessId,
    setBusinessBasics,
    setDirectors,
    addDirector,
    removeDirector,
    updateDirector,
    setBankDetails,
    setStoreInformation,
    detectRegion,
    setStatus,
    setLastSaved: setStoreLastSaved,
    saveStatus,
    setSaveStatus,
    isHydrated: isStoreHydrated,
    isDev,
  } = useSetupBusinessStore();

  const [lastLocalSaved, setLastLocalSaved] = React.useState<Date | null>(null);
  const [errors, setErrors] = React.useState<
    Record<string, string | Record<string, string>>
  >({});
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = React.useState(false);
  const [linkedSites, setLinkedSites] = React.useState<
    NonNullable<SetupBusinessApiResponse["sites"]>
  >([]);
  const [primarySiteId, setPrimarySiteId] = React.useState<string | null>(null);
  const [autoSavePausedUntil, setAutoSavePausedUntil] = React.useState(0);
  const loadedQueryBusinessIdRef = React.useRef<string | null>(null);

  const createEmptyStoreInformation = React.useCallback(
    (): StoreInformation => ({
      placeId: "",
      storeName: "",
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
    }),
    [],
  );

  const handleCompanySelect = async (company: CompanyLookupOption) => {
    setBusinessBasics({
      companyName: company.companyName,
      businessName: company.companyName,
      registrationNumber: company.companyNumber,
    });

    try {
      toast.info("Fetching company details...");
      const response = await api.get(
        `/setup-business/companies/${company.companyNumber}/people`,
      );
      const responseData = response.data?.data;

      if (responseData?.success && responseData?.data) {
        const { company: companyDetails, directors: companyDirectors } =
          responseData.data;

        if (companyDetails?.registeredOfficeAddress) {
          const addr = companyDetails.registeredOfficeAddress;
          setBusinessBasics({
            registeredAddress: {
              street: [addr.address_line_1, addr.address_line_2]
                .filter(Boolean)
                .join(", "),
              locality: addr.locality || "",
              region: addr.region || "",
              postalCode: addr.postal_code || "",
            },
          });
        }

        if (companyDirectors && companyDirectors.length > 0) {
          const newDirectors = companyDirectors.map((d: CompanyDirectorApi) => {
            const dobIso =
              d.dateOfBirth && d.dateOfBirth.year && d.dateOfBirth.month
                ? `${d.dateOfBirth.year}-${String(d.dateOfBirth.month).padStart(2, "0")}-01`
                : "";

            return {
              id: crypto.randomUUID(),
              firstName: d.name
                ? d.name.split(",")[1]?.trim() || d.name.split(" ")[0]
                : "",
              lastName: d.name
                ? d.name.split(",")[0]?.trim() ||
                  d.name.split(" ").slice(1).join(" ")
                : "",
              dob: normalizeDobToUkFormat(dobIso),
              residentialAddress: companyDetails?.registeredOfficeAddress
                ? {
                    street: [
                      companyDetails.registeredOfficeAddress.address_line_1,
                      companyDetails.registeredOfficeAddress.address_line_2,
                    ]
                      .filter(Boolean)
                      .join(", "),
                    locality:
                      companyDetails.registeredOfficeAddress.locality || "",
                    region: companyDetails.registeredOfficeAddress.region || "",
                    postalCode:
                      companyDetails.registeredOfficeAddress.postal_code || "",
                  }
                : {
                    street: "",
                    locality: "",
                    region: "",
                    postalCode: "",
                  },
              email: "",
              phone: "",
            };
          });

          setDirectors(newDirectors);
        }
        toast.success("Company details retrieved successfully");
      }
    } catch (error) {
      console.error("Failed to fetch company details:", error);
      toast.error("Failed to retrieve detailed company information");
    }
  };

  const handlePlaceSelect = (place: PlaceLookupOption) => {
    const parsed = parseSelectedPlace(
      place.description,
      businessBasics.registeredAddress.region,
      businessBasics.registeredAddress.postalCode,
    );

    setBusinessBasics({
      businessName: parsed.businessName,
      companyName: parsed.companyName,
      registeredAddress: {
        ...businessBasics.registeredAddress,
        street: parsed.street,
        locality: parsed.locality,
        region: parsed.region,
        postalCode: parsed.postalCode,
      },
    });
  };

  const phoneInfo = React.useMemo(
    () => getPhoneInfo(businessBasics.region),
    [businessBasics.region],
  );

  const isLoading = !isStoreHydrated || isLoadingDraft;

  const mapAddress = React.useCallback(
    (
      address?: {
        street?: string;
        locality?: string;
        region?: string;
        postalCode?: string;
      } | null,
    ) => ({
      street: address?.street || "",
      locality: address?.locality || "",
      region: address?.region || "",
      postalCode: address?.postalCode || "",
    }),
    [],
  );

  const decodeBankDetailsPayload = React.useCallback(
    async (payload?: Record<string, string>): Promise<BankDetails> => {
      if (!payload) {
        return {};
      }

      const resolvedEntries = await Promise.all(
        Object.entries(payload).map(async ([key, value]) => {
          if (!value || !looksLikeEncryptedValue(value)) {
            return [key, value || ""] as const;
          }

          try {
            const decryptedValue = await decrypt(value);
            return [key, decryptedValue] as const;
          } catch {
            return [key, value] as const;
          }
        }),
      );

      return Object.fromEntries(resolvedEntries) as BankDetails;
    },
    [],
  );

  const loadDraftFromQuery = React.useCallback(
    async (queryBusinessId: string) => {
      setIsLoadingDraft(true);
      try {
        const [businessResponse, bankResponse] = await Promise.all([
          api.get(`/setup-business/${queryBusinessId}`),
          api
            .get(`/setup-business/${queryBusinessId}/bank-details`)
            .catch(() => null),
        ]);

        const business = businessResponse.data?.data as
          | SetupBusinessApiResponse
          | undefined;
        if (!business?.id) {
          throw new Error("Business draft not found");
        }

        const directorsFromApi = Array.isArray(business.directors)
          ? business.directors
          : [];
        const mappedDirectors: Director[] = directorsFromApi.map(
          (director) => ({
            id: director.id || crypto.randomUUID(),
            firstName: director.firstName || "",
            lastName: director.lastName || "",
            dob: normalizeDobToUkFormat(director.dob),
            email: director.email || "",
            phone: director.phone || "",
            residentialAddress: mapAddress(director.residentialAddress),
          }),
        );

        const primarySite = (business.stores && business.stores.length > 0) ? business.stores[0] : (business.sites?.[0]);
        setLinkedSites(Array.isArray(business.stores) && business.stores.length > 0 ? business.stores : (Array.isArray(business.sites) ? business.sites : []));
        setPrimarySiteId(primarySite?.id || null);
        const mappedStoreInformation: StoreInformation = {
          placeId: primarySite?.placeId || "",
          storeName: primarySite?.name || "",
          storeAddress: mapAddress(primarySite?.storeAddress),
          currency: primarySite?.currency || "",
          businessType: primarySite?.businessType || "Restaurant",
          otherBusinessType: "",
          is24_7: !!primarySite?.is_24_7,
          selectedDays: (primarySite?.operatingHours || [])
            .map((slot) => slot.day || "")
            .filter(Boolean),
          dailyTimeSlots: (primarySite?.operatingHours || []).map((slot) => ({
            day: slot.day || "",
            openTime: slot.open_time || "",
            closeTime: slot.close_time || "",
          })),
          holidays: (primarySite?.holidays || []).map((holiday) => ({
            id: holiday.id || crypto.randomUUID(),
            name: holiday.name || "",
            date: holiday.date || "",
            isClosed: holiday.is_closed ?? true,
            openTime: holiday.open_time || "",
            closeTime: holiday.close_time || "",
          })),
          holidayExceptions: [],
          selectedChannels: (business.sites || []).map((s: any) => {
            const type = s.type?.toUpperCase();
            if (type === "POS") return "pos";
            if (type === "ECOMMERCE") return "web";
            if (type === "MARKETPLACE") return "mobile";
            return "pos";
          }) as ("pos" | "web" | "mobile")[],
        };

        const bankData = bankResponse?.data?.data as
          | BankDetailsApiResponse
          | undefined;
        const mappedBankDetails = await decodeBankDetailsPayload(
          bankData?.decryptedPayload,
        );

        const mappedBasics: BusinessBasics = {
          region: business.region || "",
          businessName: business.name || "",
          companyName: business.companyName || "",
          businessType: business.businessType || "",
          registeredAddress: mapAddress(business.registeredAddress),
          registrationNumber: business.registrationNumber || "",
          companyEmail: business.companyEmail || "",
          companyPhone: business.companyPhone || "",
        };

        setBusinessId(business.id);
        setBusinessBasics(mappedBasics);
        setDirectors(mappedDirectors);
        setBankDetails(mappedBankDetails);
        setStoreInformation(mappedStoreInformation);

        const report = buildSetupCompletionReport(
          mappedBasics,
          mappedDirectors,
          mappedBankDetails,
          mappedStoreInformation,
        );
        const firstIncompleteIndex = report.steps.findIndex(
          (step) => !step.isComplete,
        );
        const nextStep = firstIncompleteIndex >= 0 ? firstIncompleteIndex + 1 : 1;
        // Step 1, 2, and 3 are combined into UI Step 1. 
        // If the next incomplete technical step is 1, 2, or 3, we start at UI Step 1.
        setStep(nextStep >= 4 ? nextStep : 1);
      } catch (error) {
        const message =
          extractApiError(error).message ||
          "Failed to load business setup draft";
        toast.error(message);
      } finally {
        setIsLoadingDraft(false);
      }
    },
    [
      decodeBankDetailsPayload,
      mapAddress,
      setBankDetails,
      setBusinessBasics,
      setBusinessId,
      setDirectors,
      setStoreInformation,
      setStep,
    ],
  );

  // Validation for Step 1 - Combines basics, directors, and bank details
  const step1Valid = React.useMemo(() => {
    // 1. Business Basics Validation
    const {
      region,
      businessName,
      companyName,
      businessType,
      registeredAddress,
      companyEmail,
      companyPhone,
      registrationNumber,
    } = businessBasics;
    const basicsValid =
      !!region &&
      !!businessName &&
      !!companyName &&
      !!businessType &&
      !!companyEmail &&
      !!companyPhone;
    const emailValid = validateEmail(companyEmail || "");
    const phoneValid = validatePhone(companyPhone || "");
    const addressValid = validateStructuredAddress(
      registeredAddress,
      region,
    ).isValid;
    let regNumValid = true;
    if (
      businessType &&
      !["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(businessType)
    ) {
      regNumValid =
        !!registrationNumber &&
        validateRegNumber(registrationNumber, region).isValid;
    }

    // 2. Directors Validation
    let directorsValid = false;
    if (directors && directors.length > 0) {
      const isSoleTrader =
        businessBasics.businessType === "Sole Trader" ||
        businessBasics.businessType === "Sole Proprietorship" ||
        businessBasics.businessType === "Sole Establishment";
      const countValid = isSoleTrader
        ? directors.length >= 1 && directors.length <= 2
        : directors.length >= 1 && directors.length <= 10;
      const emails = directors.map((d) => d.email?.toLowerCase().trim() || "");
      const hasDuplicateEmails =
        new Set(emails.filter((e) => !!e)).size !==
        emails.filter((e) => !!e).length;
      const allDirectorsValid = directors.every(
        (d) =>
          !!d.firstName &&
          !!d.lastName &&
          validateDOB(d.dob).isValid &&
          validateStructuredAddress(d.residentialAddress, region).isValid &&
          validateEmail(d.email) &&
          !!d.phone,
      );
      directorsValid = countValid && !hasDuplicateEmails && allDirectorsValid;
    }

    // 3. Bank Details Validation
    const bankDetailsValid = validateBankDetails(bankDetails, region).isValid;

    return (
      basicsValid &&
      emailValid &&
      phoneValid &&
      addressValid &&
      regNumValid &&
      directorsValid &&
      bankDetailsValid
    );
  }, [businessBasics, directors, bankDetails]);

  // Validation for Step 2 - Store Information (renamed from old step4Valid)
  const step2Valid = React.useMemo(() => {
    const {
      storeName,
      storeAddress,
      currency,
      businessType,
      otherBusinessType,
      is24_7,
      selectedDays,
      dailyTimeSlots,
      selectedChannels,
    } = storeInformation;

    const isEcommerce = businessBasics.businessType === 'E-commerce';
    const isNameValid = !!storeName;
    const isCurrencyValid = !!currency;
    const isAddressValid = validateStructuredAddress(
      storeAddress,
      businessBasics.region,
    ).isValid;

    // For e-commerce, operating hours are NOT required
    if (isEcommerce) {
      return isNameValid && isCurrencyValid && isAddressValid;
    }

    // For physical stores, operating hours ARE required (unless 24/7)
    const isHoursValid = is24_7
      ? true
      : selectedDays.length > 0 &&
        dailyTimeSlots.length === selectedDays.length &&
        dailyTimeSlots.every((slot) => !!slot.openTime && !!slot.closeTime);

    return isNameValid && isCurrencyValid && isAddressValid && isHoursValid;
  }, [storeInformation, businessBasics]);

  // Validation for Step 3 - Sales Channels
  const step3Valid = React.useMemo(() => {
    const { selectedChannels } = storeInformation;
    const isEcommerce = businessBasics.businessType === 'E-commerce';

    if (!selectedChannels || selectedChannels.length === 0) {
      return false;
    }

    // For e-commerce, must have 'web'
    if (isEcommerce) {
      return selectedChannels.includes('web');
    }

    // For physical stores, must have 'pos'
    return selectedChannels.includes('pos');
  }, [storeInformation.selectedChannels, businessBasics.businessType]);

  // Validation for Step 4

  const mapApiSiteToDto = React.useCallback(
    (site: NonNullable<SetupBusinessApiResponse["stores"]>[number]) => ({
      storeId: site.id,
      placeId: site.placeId,
      storeName: site.name || "",
      storeAddress: {
        ...mapAddress(site.storeAddress),
        type: "SITE",
      },
      currency: site.currency || "GBP",
      is24_7: !!site.is_24_7,
      dailyTimeSlots: (site.operatingHours || []).map(
        (slot: { day?: string; open_time?: string; close_time?: string }) => ({
          day: slot.day || "",
          openTime: slot.open_time || "",
          closeTime: slot.close_time || "",
        }),
      ),
      holidays: (site.holidays || []).map(
        (holiday: {
          name?: string;
          date?: string;
          is_closed?: boolean;
          open_time?: string | null;
          close_time?: string | null;
        }) => ({
          name: holiday.name || "",
          date: holiday.date || "",
          isClosed: holiday.is_closed ?? true,
          openTime: holiday.open_time || "",
          closeTime: holiday.close_time || "",
        }),
      ),
    }),
    [mapAddress],
  );

  const saveStepProgress = React.useCallback(
    async (step: number, data: any, isAutoSave: boolean = false) => {
      if (!isAutoSave) setIsSaving(true);
      setSaveStatus("saving");
      try {
        const finalData: any = {};

        if (step === 1) {
          const { basics, directorsData, bankDetailsData } = data;
          
          if (basics) {
            const { primaryStore: _, ...basicsWithoutPrimaryStore } = basics;
            finalData.basics = {
              ...basicsWithoutPrimaryStore,
              registeredAddress: {
                ...basics.registeredAddress,
                type: "REGISTERED",
              },
            };
          }
          
          if (directorsData) {
            finalData.directors = directorsData.map((d: any) => ({
              firstName: d.firstName,
              lastName: d.lastName,
              dob: d.dob,
              email: d.email,
              phone: d.phone,
              residentialAddress: {
                ...d.residentialAddress,
                type: "RESIDENTIAL",
              },
            }));
          }
          
          if (bankDetailsData && Object.keys(bankDetailsData).length > 0) {
            const maskedBankDetails: Record<string, string> = {};
            const bankDetailsPayload: Record<string, string> = {};
            for (const [key, value] of Object.entries(bankDetailsData)) {
              const normalizedValue = String(value ?? "");
              maskedBankDetails[key] = maskSensitiveData(normalizedValue, 4);
              bankDetailsPayload[key] = normalizedValue;
            }
            finalData.bankDetails = {
              encryptedPayload: JSON.stringify(bankDetailsPayload),
              maskedPreview: maskedBankDetails,
            };
          }
        } else if (step === 2 || step === 3) {
          // Both Step 2 (Store) and Step 3 (Sites) save the storeInfos payload
          const info = data.storeInformation as StoreInformation;
          const expandedHolidayExceptions = info.holidayExceptions.flatMap(
            (exception) => {
              if (!exception.startDate || !exception.endDate) return [];
              const start = new Date(`${exception.startDate}T00:00:00`);
              const end = new Date(`${exception.endDate}T00:00:00`);
              if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
              const days: any[] = [];
              for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
                days.push({
                  name: exception.name || "Holiday Exception",
                  date: current.toISOString().slice(0, 10),
                  is_closed: true,
                });
              }
              return days;
            },
          );
          const manualHolidays = info.holidays.map((h) => ({
            name: h.name,
            date: h.date,
            is_closed: h.isClosed,
            open_time: h.openTime,
            close_time: h.closeTime,
          }));
          const holidaysByDate = new Map<string, any>();
          for (const holiday of [...expandedHolidayExceptions, ...manualHolidays]) {
            if (!holiday.date) continue;
            holidaysByDate.set(holiday.date, holiday);
          }
          
          const currentSite = {
            storeId: primarySiteId || undefined,
            placeId: info.placeId || undefined,
            storeName: info.storeName,
            storeAddress: { ...info.storeAddress, type: "SITE" },
            currency: info.currency,
            is24_7: info.is24_7,
            selectedChannels: info.selectedChannels,
            dailyTimeSlots: info.dailyTimeSlots.map((slot) => ({
              day: slot.day,
              open_time: slot.openTime,
              close_time: slot.closeTime,
            })),
            holidays: Array.from(holidaysByDate.values()),
          };
          
          const remainingSites = linkedSites
            .filter((site) => site.id && site.id !== primarySiteId)
            .map((site) => mapApiSiteToDto(site));
            
          finalData.storeInfos = [currentSite, ...remainingSites];
        }

        const buildSaveProgressUrl = (id?: string | null) =>
          `/setup-business/progress/${step}${id ? `?businessId=${encodeURIComponent(id)}` : ""}`;

        let response;
        try {
          response = await api.patch(buildSaveProgressUrl(businessId), {
            data: finalData,
          });
        } catch (error: unknown) {
          const axiosError = error as AxiosError<{ message?: string | string[] }>;
          const message = axiosError.response?.data?.message;
          const normalizedMessage = Array.isArray(message) ? message.join(", ") : message || "";
          const shouldRetryWithoutBusinessId =
            step === 1 &&
            !!businessId &&
            axiosError.response?.status === 404 &&
            normalizedMessage.toLowerCase().includes("business not found");

          if (!shouldRetryWithoutBusinessId) {
            throw error;
          }

          setBusinessId(null);
          response = await api.patch(buildSaveProgressUrl(), {
            data: finalData,
          });
        }

        if (step === 1 && response?.data?.businessId) {
          setBusinessId(response.data.businessId);
        }

        const now = new Date();
        setLastLocalSaved(now);
        setStoreLastSaved(now.toISOString());
        setSaveStatus("success");
        setStatus("SAVED");

        queryClient.invalidateQueries({ queryKey: ["businesses"] });
        queryClient.invalidateQueries({ queryKey: ["store-records"] });

        if (!isAutoSave) {
          toast.success(`Progress saved`);
        }
        return true;
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string | string[] }>;
        const isNetworkError = axiosError.code === "ERR_NETWORK" || !axiosError.response;
        const isDuplicateOwnerEmail = axiosError.response?.status === 409 && step === 1;
        if (!isAutoSave || !isNetworkError) {
          console.error(`Failed to save progress for step ${step}:`, error);
        }
        setSaveStatus("error");
        if (isAutoSave && isNetworkError) {
          setAutoSavePausedUntil(Date.now() + 60000);
        }
        const message = axiosError.response?.data?.message;
        const errorMessage =
          (isDuplicateOwnerEmail ? "Duplicate owner email found. Use unique email for each owner." : "") ||
          (isNetworkError ? "Cannot reach server. Check backend connection." : "") ||
          (Array.isArray(message) ? message.join(", ") : message) ||
          `Failed to save progress`;

        if (!isAutoSave) {
          toast.error(errorMessage);
        }
        return false;
      } finally {
        if (!isAutoSave) setIsSaving(false);
      }
    },
    [
      businessId,
      linkedSites,
      mapApiSiteToDto,
      primarySiteId,
      queryClient,
      setBusinessId,
      setSaveStatus,
      setStoreLastSaved,
      setStatus,
      setLastLocalSaved,
    ],
  );

  const handleAddDirector = React.useCallback(() => {
    if (directors.length < 10) {
      addDirector({
        id: crypto.randomUUID(),
        firstName: "",
        lastName: "",
        dob: "",
        residentialAddress: {
          street: "",
          locality: "",
          region: "",
          postalCode: "",
        },
        email: "",
        phone: "",
      });
    }
  }, [addDirector, directors.length]);

  // Auto-save logic
  React.useEffect(() => {
    if (!isStoreHydrated || !businessBasics.businessName || currentStep > 3)
      return;

    const interval = setInterval(() => {
      if (Date.now() < autoSavePausedUntil) {
        return;
      }
      console.log("Auto-saving progress...");
      const currentData =
        currentStep === 1
          ? { basics: businessBasics, directorsData: directors, bankDetailsData: bankDetails }
          : currentStep === 2
            ? { storeInformation }
            : { storeInformation };

      let isValid = false;
      if (currentStep === 1) isValid = step1Valid && step2Valid && step3Valid;
      else if (currentStep === 2) isValid = step2Valid; // Store Information
      else if (currentStep === 3) isValid = step3Valid; // Sales Channels

      if (isValid) {
        saveStepProgress(currentStep, currentData, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [
    autoSavePausedUntil,
    isStoreHydrated,
    currentStep,
    businessBasics,
    directors,
    bankDetails,
    storeInformation,
    step1Valid,
    step2Valid,
    step3Valid,
    step2Valid,
    step3Valid,
    saveStepProgress,
  ]);

  // Add this effect to force currentStep to 1 if it's 2 or 3 (legacy steps)
  React.useEffect(() => {
    if (isStoreHydrated && (currentStep === 2 || currentStep === 3)) {
      setStep(1);
    }
  }, [isStoreHydrated, currentStep, setStep]);

  // Handle case where we have a businessId but no query param (e.g. refresh)
  React.useEffect(() => {
    if (isStoreHydrated && businessId && !searchParams.get("businessId")) {
      const url = new URL(window.location.href);
      url.searchParams.set("businessId", businessId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [isStoreHydrated, businessId, searchParams]);

  React.useEffect(() => {
    if (isStoreHydrated) {
      detectRegion();
    }
  }, [isStoreHydrated, detectRegion]);

  React.useEffect(() => {
    if (!isStoreHydrated) {
      return;
    }
    const queryBusinessId = searchParams.get("businessId");
    if (!queryBusinessId) {
      return;
    }
    if (loadedQueryBusinessIdRef.current === queryBusinessId) {
      return;
    }
    loadedQueryBusinessIdRef.current = queryBusinessId;
    void loadDraftFromQuery(queryBusinessId);
  }, [isStoreHydrated, loadDraftFromQuery, searchParams]);

  // Ensure at least one owner/director for Sole Trader business types
  React.useEffect(() => {
    if (!isStoreHydrated) return;

    const soleTraderTypes = [
      "Sole Trader",
      "Sole Proprietorship",
      "Sole Establishment",
    ];
    const isSoleType = soleTraderTypes.includes(businessBasics.businessType);

    if (isSoleType && directors.length === 0) {
      handleAddDirector();
    }
  }, [
    isStoreHydrated,
    businessBasics.businessType,
    directors.length,
    handleAddDirector,
  ]);

  const validateStep1 = () => {
    const newErrors: Record<string, string | Record<string, string>> = {};
    const {
      region,
      businessName,
      companyName,
      businessType,
      registeredAddress,
      companyEmail,
      companyPhone,
      registrationNumber,
    } = businessBasics;

    if (!region) newErrors.region = "Region is required";
    if (!businessName) newErrors.businessName = "Business name is required";
    if (!companyName) newErrors.companyName = "Company name is required";
    if (!businessType) newErrors.businessType = "Business type is required";

    const addrValidation = validateStructuredAddress(registeredAddress, region);
    if (!addrValidation.isValid)
      newErrors.registeredAddress = addrValidation.errors;

    if (!validateEmail(companyEmail))
      newErrors.companyEmail = "Invalid email address";
    if (!validatePhone(companyPhone))
      newErrors.companyPhone = "Invalid phone number";

    if (
      businessType &&
      !["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(businessType)
    ) {
      const regValidation = validateRegNumber(registrationNumber || "", region);
      if (!regValidation.isValid)
        newErrors.registrationNumber =
          regValidation.error || "Invalid registration number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const directorErrors: Record<string, Record<string, string>> = {};
    const emails = directors.map((d) => d.email.toLowerCase().trim());

    directors.forEach((d) => {
      const errors: Record<string, string> = {};
      if (!d.firstName) errors.firstName = "First name is required";
      if (!d.lastName) errors.lastName = "Last name is required";

      const dobValidation = validateDOB(d.dob);
      if (!dobValidation.isValid)
        errors.dob = dobValidation.error || "Invalid date of birth";

      const addrValidation = validateStructuredAddress(
        d.residentialAddress,
        businessBasics.region,
      );
      if (!addrValidation.isValid) {
        Object.assign(errors, addrValidation.errors);
      }

      if (!validateEmail(d.email)) errors.email = "Invalid email";
      else if (
        emails.filter((e) => e === d.email.toLowerCase().trim()).length > 1
      ) {
        errors.email = "Email must be unique across directors";
      }

      if (!d.phone) errors.phone = "Phone number is required";

      if (Object.keys(errors).length > 0) {
        directorErrors[d.id] = errors;
      }
    });

    setErrors(directorErrors);
    return Object.keys(directorErrors).length === 0;
  };

  const validateStep3 = () => {
    const validation = validateBankDetails(bankDetails, businessBasics.region);
    const newErrors = { ...validation.errors };
    setErrors(newErrors);
    return validation.isValid;
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};
    const {
      storeName,
      storeAddress,
      currency,
      businessType,
      otherBusinessType,
      is24_7,
      selectedDays,
      dailyTimeSlots,
      holidays,
      holidayExceptions,
      warehouse,
      selectedChannels,
    } = storeInformation;

    if (!storeName) newErrors.storeName = "Store name is required";
    if (!currency) newErrors.currency = "Currency is required";
    if (!selectedChannels || selectedChannels.length === 0) {
      newErrors.selectedChannels = "Select at least one sales channel";
    }

    const addrValidation = validateStructuredAddress(
      storeAddress,
      businessBasics.region,
    );
    if (!addrValidation.isValid) {
      Object.assign(newErrors, addrValidation.errors);
    }

    if (
      businessType === "Others" &&
      (!otherBusinessType || otherBusinessType.length > 50)
    ) {
      newErrors.otherBusinessType = "Required (max 50 chars)";
    }

    if (!is24_7) {
      if (selectedDays.length === 0) {
        newErrors.selectedDays = "Select at least one day";
      } else {
        dailyTimeSlots.forEach((slot) => {
          if (!slot.openTime || !slot.closeTime) {
            newErrors[`${slot.day}-time`] = "Times required";
          }
        });
      }
    }

    if (hasHolidayOverlap(holidays)) {
      newErrors.holidays = "Holiday dates cannot overlap";
    }

    holidays.forEach((h, i) => {
      if (!h.name) newErrors[`holiday-${i}-name`] = "Name required";
      if (!h.date) newErrors[`holiday-${i}-date`] = "Date required";
      if (!h.isClosed && (!h.openTime || !h.closeTime)) {
        newErrors[`holiday-${i}-time`] = "Times required";
      }
    });

    // Validate Holiday Exceptions
    if (holidayExceptions) {
      holidayExceptions.forEach((ex, i) => {
        if (!ex.name)
          newErrors[`exception-${i}-name`] = "Holiday name required";
        if (!ex.startDate)
          newErrors[`exception-${i}-start`] = "Start date required";
        if (!ex.endDate) newErrors[`exception-${i}-end`] = "End date required";

        if (ex.startDate && ex.endDate) {
          if (ex.endDate < ex.startDate) {
            newErrors[`exception-${i}-range`] =
              "End date cannot be earlier than start date";
          }
        }
      });
    }

    if (businessType === "E-commerce") {
      if (!warehouse?.name) newErrors.warehouseName = "Warehouse name required";
      if (!warehouse?.street)
        newErrors.warehouseStreet = "Street address required";
      if (!warehouse?.city) newErrors.warehouseCity = "City required";
      if (!warehouse?.state) newErrors.warehouseState = "State required";
      if (!warehouse?.postalCode)
        newErrors.warehousePostalCode = "Postal code required";
      if (!warehouse?.country) newErrors.warehouseCountry = "Country required";

      if (warehouse?.email && !validateEmail(warehouse.email)) {
        newErrors.warehouseEmail = "Invalid email";
      }
      if (warehouse?.phone && !validatePhone(warehouse.phone)) {
        newErrors.warehousePhone = "Invalid phone";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mapSiteInfoToDto = (info: typeof storeInformation) => {
    return {
      placeId: info.placeId || undefined,
      storeName: info.storeName, // Fixed from storeName
      storeAddress: { // Fixed from storeAddress
        ...info.storeAddress,
        type: "SITE",
      },
      currency: info.currency,
      is24_7: info.is24_7,
      dailyTimeSlots: info.dailyTimeSlots.map((slot) => ({
        day: slot.day,
        open_time: slot.openTime,
        close_time: slot.closeTime,
      })),
      holidays: info.holidays.map((h) => ({
        name: h.name,
        date: h.date,
        is_closed: h.isClosed,
        open_time: h.openTime,
        close_time: h.closeTime,
      })),
      selectedChannels: info.selectedChannels,
    };
  };

  const handleNext = async () => {
    if (currentStep <= 3) {
      // Step 1 now includes: basics + directors + bank details
      const isValid = step1Valid;
      if (isValid) {
        const saved = await saveStepProgress(1, {
          basics: businessBasics,
          directorsData: directors,
          bankDetailsData: bankDetails,
        });
        if (saved) {
          // Skip directly to step 4 (Store Information), which will be shown as "Step 2: Your Location"
          setStep(4);
          setErrors({});
        }
      } else {
        // Run validations to show errors
        validateStep1();
        toast.error("Please fill in all required fields in Legal Information");
      }
    } else if (currentStep === 4) {
      // Step 4 is Store Information (shown as "Step 2: Your Location")
      const isValid = validateStep4();
      if (isValid) {
        const saved = await saveStepProgress(4, mapSiteInfoToDto(storeInformation));
        if (saved) {
          setStep(5); // Go to Sales Channels step
          setErrors({});
        }
      }
    }
  };

  const handleAddSite = async () => {
    const isValid = validateStep4();
    if (!isValid) {
      toast.error("Complete current site details before adding another site.");
      return;
    }

    const saved = await saveStepProgress(4, storeInformation);
    if (!saved) {
      return;
    }

    if (businessId) {
      await loadDraftFromQuery(businessId);
    }

    setPrimarySiteId(null);
    setStoreInformation(createEmptyStoreInformation());
    setErrors({});
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 4) {
        setStep(1);
      } else {
        setStep(currentStep - 1);
      }
      setErrors({});
      window.scrollTo(0, 0);
    }
  };

  const handleFinish = async () => {
    const step1Ok = step1Valid;
    if (!step1Ok) {
      setStep(1);
      window.scrollTo(0, 0);
      toast.error("Please complete legal information first.");
      return;
    }

    const step2Ok = step2Valid;
    if (!step2Ok) {
      setStep(4);
      window.scrollTo(0, 0);
      toast.error("Please complete site information first.");
      return;
    }

    const step3Ok = step3Valid;
    if (!step3Ok) {
      setStep(5);
      window.scrollTo(0, 0);
      toast.error("Please select sales channels first.");
      return;
    }

    setIsSaving(true);
    try {
      const maskedBankDetails: Record<string, string> = {};
      const bankDetailsPayload: Record<string, string> = {};

      for (const [key, value] of Object.entries(bankDetails)) {
        const normalizedValue = String(value ?? "");
        maskedBankDetails[key] = maskSensitiveData(normalizedValue, 4);
        bankDetailsPayload[key] = normalizedValue;
      }

      const { primaryStore: _, ...basicsWithoutPrimaryStore } = businessBasics;
      const payload = {
        businessId: businessId || undefined,
        basics: {
          ...basicsWithoutPrimaryStore,
          registeredAddress: {
            ...businessBasics.registeredAddress,
            type: "REGISTERED",
          },
        },
        directors: directors.map((d) => ({
          firstName: d.firstName,
          lastName: d.lastName,
          dob: d.dob,
          email: d.email,
          phone: d.phone,
          residentialAddress: {
            ...d.residentialAddress,
            type: "RESIDENTIAL",
          },
        })),
        bankDetails: {
          encryptedPayload: JSON.stringify(bankDetailsPayload),
          maskedPreview: maskedBankDetails,
        },
        storeInfo: mapSiteInfoToDto(storeInformation),
        storeInfos: [
          {
            ...mapSiteInfoToDto(storeInformation),
            storeId: primarySiteId || undefined,
          },
          ...linkedSites
            .filter((site) => site.id && site.id !== primarySiteId)
            .map((site) => mapApiSiteToDto(site)),
        ],
      };

      const response = await api.post("/setup-business/submit", payload);

      if (response.data) {
        toast.success("Business setup completed successfully!");
        setIsSubmitted(true);
        window.scrollTo(0, 0);
        queryClient.invalidateQueries({ queryKey: ["businesses"] });
        queryClient.invalidateQueries({ queryKey: ["store-records"] });
        useSetupBusinessStore.getState().reset();
      }
    } catch (error: unknown) {
      console.error("Failed to submit setup data:", error);
      const axiosError = error as AxiosError<{ message?: string | string[] }>;
      const message = axiosError.response?.data?.message;
      const errorMessage = Array.isArray(message)
        ? message.join(", ")
        : message || "An error occurred while saving your data.";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  const content = isSubmitted ? (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md text-center p-8">
        <div className="mb-4 flex justify-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <CheckIcon className="size-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold mb-2">
          Setup Complete!
        </CardTitle>
        <CardDescription className="text-lg">
          Thank you for setting up your business profile. Our team will review
          your details soon.
        </CardDescription>

        <HolidayExceptionsSummary
          exceptions={storeInformation.holidayExceptions || []}
        />

        <div className="mt-8">
          <Button onClick={() => (window.location.href = "/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  ) : (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 p-6 rounded-xl border bg-card/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight mb-2">
              Setup Your Business
            </h1>
            <p className="text-muted-foreground mb-6">
              Please complete the following steps to get your store ready.
            </p>
          </div>
          {(lastLocalSaved || saveStatus !== "idle") && (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  saveStatus === "saving" &&
                    "bg-muted text-muted-foreground border-border animate-pulse",
                  saveStatus === "success" &&
                    "bg-muted text-foreground border-border",
                  saveStatus === "error" &&
                    "bg-destructive/10 text-destructive border-destructive/20",
                  saveStatus === "idle" &&
                    "bg-muted text-muted-foreground border-border",
                )}
              >
                {saveStatus === "saving"
                  ? "Auto-Saving..."
                  : saveStatus === "success"
                    ? "All changes saved"
                    : saveStatus === "error"
                      ? "Save failed"
                      : "Saved"}
              </span>
              {lastLocalSaved && (
                <p className="text-[10px] text-muted-foreground italic">
                  Last saved: {lastLocalSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-8 relative h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${currentStep === 1 ? 33.33 : currentStep === 4 ? 66.66 : currentStep === 5 ? 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-8">
          <span className={currentStep >= 1 ? "text-primary" : ""}>
            1. Legal Information
          </span>
          <span className={currentStep >= 4 ? "text-primary" : ""}>
            2. Your Location
          </span>
          <span className={currentStep >= 5 ? "text-primary" : ""}>
            3. Sales Channels
          </span>
        </div>

        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Please fix the errors below</AlertTitle>
            <AlertDescription>
              Some fields require your attention before you can proceed.
            </AlertDescription>
          </Alert>
        )}

        {/* Step Forms */}
        <div className="mt-8">
          {currentStep <= 3 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Legal Information</h2>
                <p className="text-sm text-muted-foreground">
                  Tell us about your business entity and location.
                </p>
              </div>

              <div className="space-y-6">
                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RegionSelect
                    value={businessBasics.region}
                    onChange={(val) =>
                      setBusinessBasics({ region: val, businessType: "" })
                    }
                    error={errors.region as string | undefined}
                  />
                  <BusinessTypeSelect
                    region={businessBasics.region}
                    value={businessBasics.businessType}
                    onChange={(val) => setBusinessBasics({ businessType: val })}
                    error={errors.businessType as string | undefined}
                  />
                </FieldGroup>
                <CompanyLookup
                  businessType={businessBasics.businessType}
                  onCompanySelected={handleCompanySelect}
                />
                <PlaceLookup
                  businessType={businessBasics.businessType}
                  onPlaceSelected={handlePlaceSelect}
                />

                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field data-invalid={!!errors.businessName}>
                    <FieldLabel htmlFor="businessName">
                      Business Name
                    </FieldLabel>
                    <Input
                      id="businessName"
                      value={businessBasics.businessName ?? ""}
                      onChange={(e) =>
                        setBusinessBasics({ businessName: e.target.value })
                      }
                      placeholder="Enter business trading name"
                      aria-invalid={!!errors.businessName}
                    />
                    {typeof errors.businessName === "string" && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.businessName}
                      </p>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.companyName}>
                    <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
                    <Input
                      id="companyName"
                      value={businessBasics.companyName ?? ""}
                      onChange={(e) =>
                        setBusinessBasics({ companyName: e.target.value })
                      }
                      placeholder="Enter legal company name"
                      aria-invalid={!!errors.companyName}
                    />
                    {typeof errors.companyName === "string" && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.companyName}
                      </p>
                    )}
                  </Field>
                </FieldGroup>

                {/* Registration Number Field - Show for specific types in UK or as optional in other regions */}
                {((businessBasics.region === "United Kingdom" &&
                  businessBasics.businessType === "Limited Company") ||
                  (businessBasics.region !== "United Kingdom" &&
                    businessBasics.businessType &&
                    !["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(businessBasics.businessType))) && (
                  <Field data-invalid={!!errors.registrationNumber}>
                    <FieldLabel htmlFor="registrationNumber">
                      {businessBasics.region === "USA"
                        ? "EIN / Tax ID Number"
                        : "Business Registration Number"}
                    </FieldLabel>
                    <Input
                      id="registrationNumber"
                      value={businessBasics.registrationNumber ?? ""}
                      onChange={(e) => {
                        let val = e.target.value.toUpperCase();
                        if (businessBasics.region === "USA") {
                          // Auto-format EIN: XX-XXXXXXX
                          val = val.replace(/\D/g, "");
                          if (val.length > 2) {
                            val = val.slice(0, 2) + "-" + val.slice(2, 9);
                          }
                        }
                        setBusinessBasics({ registrationNumber: val });
                      }}
                      maxLength={businessBasics.region === "USA" ? 10 : 15}
                      placeholder={
                        businessBasics.region === "USA"
                          ? "9 digits (e.g. 12-3456789)"
                          : "Enter registration number"
                      }
                      aria-invalid={!!errors.registrationNumber}
                    />
                    {typeof errors.registrationNumber === "string" && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.registrationNumber}
                      </p>
                    )}
                  </Field>
                )}

                <AddressInput
                  region={businessBasics.region}
                  value={businessBasics.registeredAddress}
                  onChange={(val) =>
                    setBusinessBasics({ registeredAddress: val })
                  }
                  errors={
                    errors.registeredAddress as
                      | Record<string, string>
                      | undefined
                  }
                  label="Registered Business Address"
                />

                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field data-invalid={!!errors.companyEmail}>
                    <FieldLabel htmlFor="companyEmail">
                      Company Email
                    </FieldLabel>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={businessBasics.companyEmail ?? ""}
                      onChange={(e) =>
                        setBusinessBasics({ companyEmail: e.target.value })
                      }
                      placeholder="contact@business.com"
                      aria-invalid={!!errors.companyEmail}
                    />
                    {typeof errors.companyEmail === "string" && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.companyEmail}
                      </p>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.companyPhone}>
                    <FieldLabel htmlFor="companyPhone">
                      Company Contact Phone
                    </FieldLabel>
                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 rounded-md border border-input bg-muted text-muted-foreground text-sm font-medium shrink-0 min-w-14">
                        {phoneInfo.prefix}
                      </div>
                      <Input
                        id="companyPhone"
                        type="tel"
                        value={businessBasics.companyPhone ?? ""}
                        onChange={(e) =>
                          setBusinessBasics({ companyPhone: e.target.value })
                        }
                        placeholder={phoneInfo.placeholder}
                        aria-invalid={!!errors.companyPhone}
                        className="flex-1"
                      />
                    </div>
                    {typeof errors.companyPhone === "string" && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.companyPhone}
                      </p>
                    )}
                  </Field>
                </FieldGroup>

                {/* Directors Section */}
                <section className="pt-8 border-t mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(
                          businessBasics.businessType,
                        )
                          ? "Owner Details"
                          : "Director Details"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Tell us who owns or manages this business.
                      </p>
                    </div>
                    {!["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(
                      businessBasics.businessType,
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddDirector}
                        disabled={directors.length >= 10}
                      >
                        <PlusIcon data-icon="inline-start" />
                        Add Director
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {directors.map((director) => (
                      <DirectorForm
                        key={director.id}
                        director={director}
                        region={businessBasics.region}
                        isSoleTrader={["Sole Trader", "Sole Proprietorship", "Sole Establishment"].includes(
                          businessBasics.businessType,
                        )}
                        onUpdate={(data) => updateDirector(director.id, data)}
                        onRemove={
                          directors.length > 1
                            ? () => removeDirector(director.id)
                            : undefined
                        }
                        errors={
                          errors[director.id] as Record<string, string> | undefined
                        }
                      />
                    ))}
                  </div>
                </section>

                {/* Bank Details Section */}
                <section className="pt-8 border-t mt-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">Bank Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the bank account where you&apos;d like to receive payments.
                    </p>
                  </div>
                  <BankDetailsForm
                    region={businessBasics.region}
                    details={bankDetails}
                    onUpdate={setBankDetails}
                    errors={errors as Record<string, string>}
                  />
                </section>

                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleNext}
                    disabled={(!isDev && !step1Valid) || isSaving}
                    className="w-full md:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Next: Your Location
                        <ChevronRightIcon data-icon="inline-end" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">
                  {businessBasics.businessType === 'E-commerce'
                    ? 'Set Up Your Warehouse'
                    : 'Set Up Your Store Location'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {businessBasics.businessType === 'E-commerce'
                    ? 'Where do you store and ship products from?'
                    : 'Where do customers visit you?'}
                </p>
              </div>

              <StoreInformationForm
                region={businessBasics.region}
                info={storeInformation}
                onUpdate={(data) => {
                  setStoreInformation(data);
                  const fieldNames = Object.keys(data);
                  if (fieldNames.length > 0) {
                    const newErrors = { ...errors };
                    fieldNames.forEach((name) => delete newErrors[name]);
                    setErrors(newErrors);
                  }
                }}
                errors={errors as Record<string, string>}
              />

              <div className="flex flex-col md:flex-row gap-4 justify-between mt-8">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="order-2 md:order-1"
                  disabled={isSaving}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!step2Valid || isSaving}
                  className="order-1 md:order-2 w-full md:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next: Sales Channels
                      <ChevronRightIcon data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Choose Your Sales Channels</h2>
                <p className="text-sm text-muted-foreground">
                  {businessBasics.businessType === 'E-commerce'
                    ? 'Select all the ways customers can buy from you online. You can add more later.'
                    : 'Select all the ways customers can buy from you. You can add more later.'}
                </p>
              </div>

              <SalesChannelSelector
                value={storeInformation.selectedChannels || ["pos"]}
                onChange={(channels: SalesChannelValue[]) => setStoreInformation({ selectedChannels: channels })}
                businessType={businessBasics.businessType}
              />

              <div className="flex flex-col md:flex-row gap-4 justify-between mt-8">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="order-2 md:order-1"
                  disabled={isSaving}
                >
                  <ChevronLeftIcon data-icon="inline-start" />
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={!step3Valid || isSaving}
                  className="order-1 md:order-2 w-full md:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Finish Setup
                      <CheckIcon data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {content}
    </div>
  );
}
