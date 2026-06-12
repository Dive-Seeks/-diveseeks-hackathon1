import {
  BankDetails,
  BusinessBasics,
  Director,
  StoreInformation,
} from "@/lib/setup-business-store";
import { getBankSchema } from "@/lib/region-service";
import {
  hasHolidayOverlap,
  validateBankDetails,
  validateDOB,
  validateEmail,
  validatePhone,
  validateRegNumber,
  validateStructuredAddress,
} from "@/lib/validation";

export const SETUP_RESUME_SESSION_KEY = "setup-business-resume-allowed";

export type SetupStepKey = "legal-information" | "owners" | "bank" | "site";

export interface SetupStepCompletion {
  key: SetupStepKey;
  title: string;
  isComplete: boolean;
  missingFields: string[];
}

export interface SetupCompletionReport {
  hasIncompleteForms: boolean;
  completedSteps: number;
  totalSteps: number;
  completionPercent: number;
  steps: SetupStepCompletion[];
  incompleteStepTitles: string[];
}

export interface SetupRedirectLogContext {
  event: string;
  details: Record<string, unknown>;
}

const pushRedirectLogToSession = (payload: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = "setup-business-redirect-logs";
  const existing = window.sessionStorage.getItem(key);
  const logs = existing
    ? (JSON.parse(existing) as Record<string, unknown>[])
    : [];
  const nextLogs = [...logs, payload].slice(-50);
  window.sessionStorage.setItem(key, JSON.stringify(nextLogs));
};

export const logSetupRedirectEvent = ({
  event,
  details,
}: SetupRedirectLogContext) => {
  const payload = {
    timestamp: new Date().toISOString(),
    event,
    details,
  };

  if (typeof window !== "undefined") {
    console.info("[setup-business-redirect]", payload);
  }

  pushRedirectLogToSession(payload);
};

export const allowSetupResumeOnce = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SETUP_RESUME_SESSION_KEY, "1");
};

export const consumeSetupResumeAllowance = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const hasAllowance =
    window.sessionStorage.getItem(SETUP_RESUME_SESSION_KEY) === "1";
  if (hasAllowance) {
    window.sessionStorage.removeItem(SETUP_RESUME_SESSION_KEY);
  }

  return hasAllowance;
};

const validateStep1 = (businessBasics: BusinessBasics): SetupStepCompletion => {
  const missingFields: string[] = [];
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

  if (!region.trim()) missingFields.push("Region");
  if (!businessName.trim()) missingFields.push("Business Name");
  if (!companyName.trim()) missingFields.push("Company Name");
  if (!businessType.trim()) missingFields.push("Business Type");

  const addressValidation = validateStructuredAddress(
    registeredAddress,
    region,
  );
  if (!addressValidation.isValid) {
    missingFields.push(...Object.values(addressValidation.errors));
  }

  if (!companyEmail.trim()) {
    missingFields.push("Company Email");
  } else if (!validateEmail(companyEmail)) {
    missingFields.push("Company Email Format");
  }

  if (!companyPhone.trim()) {
    missingFields.push("Company Phone");
  } else if (!validatePhone(companyPhone)) {
    missingFields.push("Company Phone Format");
  }

  const requiresRegistrationNumber =
    !!businessType &&
    businessType !== "Sole Trader" &&
    businessType !== "Sole Proprietorship";
  if (requiresRegistrationNumber) {
    if (!registrationNumber?.trim()) {
      missingFields.push("Registration Number");
    } else if (!validateRegNumber(registrationNumber, region).isValid) {
      missingFields.push("Registration Number Format");
    }
  }

  return {
    key: "legal-information",
    title: "Legal Information",
    isComplete: missingFields.length === 0,
    missingFields: Array.from(new Set(missingFields)),
  };
};

const validateStep2 = (
  directors: Director[],
  businessType: string,
  region: string,
): SetupStepCompletion => {
  const missingFields: string[] = [];

  if (directors.length === 0) {
    missingFields.push("At least one director");
  }

  const isSoleTrader =
    businessType === "Sole Trader" ||
    businessType === "Sole Proprietorship" ||
    businessType === "Sole Establishment";
  if (isSoleTrader && (directors.length < 1 || directors.length > 2)) {
    missingFields.push("Sole Trader must have 1-2 owners");
  }
  if (!isSoleTrader && directors.length > 10) {
    missingFields.push("Maximum 10 directors");
  }

  const emails = directors
    .map((director) => director.email?.toLowerCase().trim())
    .filter((email): email is string => !!email);
  if (new Set(emails).size !== emails.length) {
    missingFields.push("Unique director emails");
  }

  directors.forEach((director, index) => {
    const prefix = `Director ${index + 1}`;
    if (!director.firstName?.trim()) missingFields.push(`${prefix} First Name`);
    if (!director.lastName?.trim()) missingFields.push(`${prefix} Last Name`);
    if (!director.dob?.trim()) {
      missingFields.push(`${prefix} Date of Birth`);
    } else if (!validateDOB(director.dob).isValid) {
      missingFields.push(`${prefix} Date of Birth Format`);
    }

    const addressValidation = validateStructuredAddress(
      director.residentialAddress,
      region,
    );
    if (!addressValidation.isValid) {
      missingFields.push(`${prefix} Residential Address`);
    }

    if (!director.email?.trim()) {
      missingFields.push(`${prefix} Email`);
    } else if (!validateEmail(director.email)) {
      missingFields.push(`${prefix} Email Format`);
    }

    if (!director.phone?.trim()) {
      missingFields.push(`${prefix} Phone`);
    }
  });

  return {
    key: "owners",
    title:
      businessType === "Sole Trader" ? "Owner Details" : "Director Details",
    isComplete: missingFields.length === 0,
    missingFields: Array.from(new Set(missingFields)),
  };
};

const validateStep3 = (
  bankDetails: BankDetails,
  region: string,
): SetupStepCompletion => {
  const missingFields: string[] = [];
  const bankValidation = validateBankDetails(bankDetails, region);
  const bankSchema = getBankSchema(region);

  if (!bankValidation.isValid) {
    bankSchema.fields.forEach((field) => {
      if (bankValidation.errors[field.name]) {
        missingFields.push(field.label);
      }
    });
  }

  return {
    key: "bank",
    title: "Bank Details",
    isComplete: missingFields.length === 0,
    missingFields: Array.from(new Set(missingFields)),
  };
};

const validateStep4 = (
  siteInformation: StoreInformation,
  region: string,
): SetupStepCompletion => {
  const missingFields: string[] = [];
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
  } = siteInformation;

  if (!storeName.trim()) missingFields.push("Store Name");
  if (!currency.trim()) missingFields.push("Currency");

  const addressValidation = validateStructuredAddress(storeAddress, region);
  if (!addressValidation.isValid) {
    missingFields.push(...Object.values(addressValidation.errors));
  }

  if (
    businessType === "Others" &&
    (!otherBusinessType || otherBusinessType.length > 50)
  ) {
    missingFields.push("Other Business Type");
  }

  if (!is24_7) {
    if (selectedDays.length === 0) {
      missingFields.push("Operating Days");
    } else {
      dailyTimeSlots.forEach((slot: { day: string; openTime: string; closeTime: string }) => {
        if (!slot.openTime || !slot.closeTime) {
          missingFields.push(`${slot.day} Operating Hours`);
        }
      });
    }
  }

  if (hasHolidayOverlap(holidays)) {
    missingFields.push("Unique Holiday Dates");
  }

  holidays.forEach((holiday: { name?: string; date?: string; isClosed: boolean; openTime?: string; closeTime?: string }, index: number) => {
    const prefix = `Holiday ${index + 1}`;
    if (!holiday.name?.trim()) missingFields.push(`${prefix} Name`);
    if (!holiday.date?.trim()) missingFields.push(`${prefix} Date`);
    if (!holiday.isClosed && (!holiday.openTime || !holiday.closeTime)) {
      missingFields.push(`${prefix} Operating Hours`);
    }
  });

  holidayExceptions?.forEach((holidayException: { name?: string; startDate?: string; endDate?: string }, index: number) => {
    const prefix = `Holiday Exception ${index + 1}`;
    if (!holidayException.name?.trim()) missingFields.push(`${prefix} Name`);
    if (!holidayException.startDate?.trim())
      missingFields.push(`${prefix} Start Date`);
    if (!holidayException.endDate?.trim())
      missingFields.push(`${prefix} End Date`);
    if (
      holidayException.startDate &&
      holidayException.endDate &&
      holidayException.endDate < holidayException.startDate
    ) {
      missingFields.push(`${prefix} Date Range`);
    }
  });

  if (businessType === "E-commerce") {
    if (!warehouse?.name?.trim()) missingFields.push("Warehouse Name");
    if (!warehouse?.street?.trim()) missingFields.push("Warehouse Street");
    if (!warehouse?.city?.trim()) missingFields.push("Warehouse City");
    if (!warehouse?.state?.trim()) missingFields.push("Warehouse State");
    if (!warehouse?.postalCode?.trim())
      missingFields.push("Warehouse Postal Code");
    if (!warehouse?.country?.trim()) missingFields.push("Warehouse Country");
    if (warehouse?.email && !validateEmail(warehouse.email)) {
      missingFields.push("Warehouse Email Format");
    }
    if (warehouse?.phone && !validatePhone(warehouse.phone)) {
      missingFields.push("Warehouse Phone Format");
    }
  }

  return {
    key: "site",
    title: "Site Information",
    isComplete: missingFields.length === 0,
    missingFields: Array.from(new Set(missingFields)),
  };
};

export const buildSetupCompletionReport = (
  businessBasics: BusinessBasics,
  directors: Director[],
  bankDetails: BankDetails,
  siteInformation: StoreInformation,
): SetupCompletionReport => {
  const steps = [
    validateStep1(businessBasics),
    validateStep2(
      directors,
      businessBasics.businessType,
      businessBasics.region,
    ),
    validateStep3(bankDetails, businessBasics.region),
    validateStep4(siteInformation, businessBasics.region),
  ];

  const completedSteps = steps.filter((step) => step.isComplete).length;
  const totalSteps = steps.length;
  const hasIncompleteForms = completedSteps !== totalSteps;

  return {
    hasIncompleteForms,
    completedSteps,
    totalSteps,
    completionPercent: Math.round((completedSteps / totalSteps) * 100),
    steps,
    incompleteStepTitles: steps
      .filter((step) => !step.isComplete)
      .map((step) => step.title),
  };
};
