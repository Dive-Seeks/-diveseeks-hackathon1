import regionsData from "./data/regions.json";

export interface BusinessType {
  label: string;
  value: string;
}

export interface AddressSchema {
  streetLabel: string;
  localityLabel: string;
  regionLabel: string;
  postalCodeLabel: string;
  postalCodePattern: string;
}

export interface BankField {
  name: string;
  label: string;
  placeholder: string;
  mask?: string;
  validation: string;
  type?: "text" | "select";
  options?: string[];
}

export interface BankSchema {
  fields: BankField[];
}

export interface RegionData {
  label: string;
  businessTypes: BusinessType[];
  addressSchema: AddressSchema;
  phonePrefix: string;
  phonePlaceholder: string;
  bankSchema: BankSchema;
}

export type RegionsDataMap = Record<string, RegionData>;

const regions = regionsData as unknown as Record<string, RegionData>;

export const getRegions = () => {
  return Object.keys(regions).map((key) => ({
    label: regions[key].label,
    value: key,
  }));
};

export const getRegionData = (region: string): RegionData | undefined => {
  return regions[region];
};

export const getBusinessTypes = (region: string): BusinessType[] => {
  const data = getRegionData(region);
  return data ? data.businessTypes : [];
};

export const getAddressSchema = (region: string): AddressSchema => {
  const data = getRegionData(region);
  if (data) return data.addressSchema;

  // Default schema for "Others" or if region is missing
  return regions.Others.addressSchema;
};

export const getPhoneInfo = (
  region: string,
): { prefix: string; placeholder: string } => {
  const data = getRegionData(region);
  if (data) {
    return {
      prefix: data.phonePrefix,
      placeholder: data.phonePlaceholder,
    };
  }
  return {
    prefix: regions.Others.phonePrefix,
    placeholder: regions.Others.phonePlaceholder,
  };
};

export const getBankSchema = (region: string): BankSchema => {
  const data = getRegionData(region);
  if (data && data.bankSchema) return data.bankSchema;

  // Default schema for "Others" or if region is missing
  return regions.Others.bankSchema;
};
