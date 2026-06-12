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
}

export interface PrimaryStoreBasics {
  storeName: string;
  storeAddress: Address;
  placeId?: string;
}
