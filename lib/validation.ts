import { Address, BankDetails } from "./setup-business-store";
import { getAddressSchema, getBankSchema } from "./region-service";

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const re = /^\+?[\d\s-]{10,15}$/;
  return re.test(phone);
};

export const isValidTimeRange = (
  openTime: string,
  closeTime: string,
): boolean => {
  if (!openTime || !closeTime) return false;
  // If open and close are same, it's invalid (should use 24/7 toggle for 24h)
  return openTime !== closeTime;
};

export const hasHolidayOverlap = (holidays: { date: string }[]): boolean => {
  const dates = holidays.map((h) => h.date);
  return new Set(dates).size !== dates.length;
};

export const validateDOB = (
  dob: string,
): { isValid: boolean; error?: string } => {
  const parts = dob.split("/");
  if (parts.length !== 3)
    return { isValid: false, error: "Format must be DD/MM/YYYY" };
  const d = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y))
    return { isValid: false, error: "Invalid date" };

  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return { isValid: false, error: "Invalid date" };
  }

  const today = new Date();
  let age = today.getFullYear() - y;
  const mDiff = today.getMonth() - (m - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < d)) {
    age--;
  }

  if (age < 16)
    return { isValid: false, error: "Must be at least 16 years old" };
  return { isValid: true };
};

export const validateStructuredAddress = (
  address: Address,
  region: string,
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  const schema = getAddressSchema(region);

  if (!address || typeof address !== "object") {
    return {
      isValid: false,
      errors: { street: "Address is required" },
    };
  }

  const street = String(address.street || "").trim();
  const locality = String(address.locality || "").trim();
  const regionField = String(address.region || "").trim();
  const postalCode = String(address.postalCode || "").trim();

  if (!street) {
    errors.street = `${schema.streetLabel} is required`;
  }
  if (!locality) {
    errors.locality = `${schema.localityLabel} is required`;
  }
  if (!regionField) {
    errors.region = `${schema.regionLabel} is required`;
  }
  if (!postalCode) {
    errors.postalCode = `${schema.postalCodeLabel} is required`;
  } else if (schema.postalCodePattern) {
    const re = new RegExp(schema.postalCodePattern);
    if (!re.test(postalCode)) {
      errors.postalCode = `Invalid ${schema.postalCodeLabel.toLowerCase()}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateBankDetails = (
  details: BankDetails,
  region: string,
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  const schema = getBankSchema(region);

  schema.fields.forEach((field) => {
    const value = (details[field.name] || "").trim();
    if (!value) {
      errors[field.name] = `${field.label} is required`;
    } else if (field.validation) {
      const re = new RegExp(field.validation);
      if (!re.test(value)) {
        errors[field.name] = `Invalid ${field.label.toLowerCase()} format`;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAddress = (
  address: string,
): { isValid: boolean; error?: string } => {
  if (!address.trim()) return { isValid: false, error: "Address is required" };

  // Basic lines check - split by newline or comma
  const lines = address
    .split(/[\r\n,]+/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      isValid: false,
      error: "Please provide at least a street and a city/town",
    };
  }

  // Region specific postcode check (simplified for this example)
  const ukPostcodeRegex =
    /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/;

  const hasPostcode = lines.some((line) => ukPostcodeRegex.test(line));
  if (!hasPostcode) {
    return { isValid: false, error: "Please include a valid postcode" };
  }

  return { isValid: true };
};

export const validateRegNumber = (
  reg: string,
  region: string = "United Kingdom",
): { isValid: boolean; error?: string } => {
  if (region === "USA") {
    // EIN format is XX-XXXXXXX (9 digits)
    const cleanReg = reg.replace(/[-\s]/g, "");
    const re = /^\d{9}$/;
    if (!re.test(cleanReg))
      return {
        isValid: false,
        error: "EIN must be 9 digits (e.g. 12-3456789)",
      };
    return { isValid: true };
  }

  // UK and others default to 8 alphanumeric characters
  const re = /^[a-zA-Z0-9]{1,8}$/;
  if (!re.test(reg))
    return { isValid: false, error: "Must be up to 8 alphanumeric characters" };
  return { isValid: true };
};
