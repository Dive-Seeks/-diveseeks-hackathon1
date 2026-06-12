export type { ApiResponse, PaginatedResponse } from '@dive-pos/types';

export interface ApiEnvelope<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface ApiErrorPayload {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

export interface PaginatedMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedData<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  tenantId?: string;
  storeId?: string;
  isVerified?: boolean;
  isCoder?: boolean;
  isBusiness?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  storeId?: string;
  isCoder?: boolean;
  isBusiness?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
  userId: string;
}

export interface ResetPasswordRequest {
  token: string;
  userId: string;
  newPassword: string;
}

export interface Address {
  id?: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
}

export interface Director {
  id?: string;
  firstName: string;
  lastName: string;
  dob: string;
  residentialAddress: Address;
  email: string;
  phone: string;
}

export interface BankDetails {
  id?: string;
  encryptedPayload: string;
  maskedPreview: Record<string, unknown>;
  businessId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperatingHour {
  id?: string;
  day: string;
  open_time: string;
  close_time: string;
}

export interface Holiday {
  id?: string;
  name: string;
  date: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

export interface StoreAddress {
  id?: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  country?: string;
}

export interface Store {
  id: string;
  name: string;
  currency: string;
  is_24_7: boolean;
  businessId: string;
  storeAddress?: StoreAddress;
  operatingHours?: OperatingHour[];
  holidays?: Holiday[];
  placeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type SiteType = 'POS' | 'ECOMMERCE' | 'RESTAURANT' | 'MARKETPLACE';

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  isActive: boolean;
  businessId: string;
  storeId?: string;
  currency: string;
  categoryCount?: number;
  itemCount?: number;
  modifierCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  companyName: string;
  businessType: string;
  registrationNumber?: string;
  companyEmail: string;
  companyPhone: string;
  region: string;
  status: "UNSAVED" | "SAVED" | "SUBMITTED" | "PENDING" | "ACTIVE";
  userId: string;
  registeredAddress?: Address;
  directors?: Director[];
  bankDetails?: BankDetails;
  stores?: Store[];
  sites?: Site[];
  departments?: Department[];
  employees?: Employee[];
  settings?: BusinessSetting[];
  configurations?: BusinessConfiguration[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessesQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface SetupBusinessListQuery {
  page?: number;
  limit?: number;
}

export interface CompleteSetupPayload {
  basics: {
    region: string;
    businessName: string;
    companyName: string;
    businessType: string;
    registeredAddress: Address;
    registrationNumber?: string;
    companyEmail: string;
    companyPhone: string;
  };
  directors: Director[];
  bankDetails: {
    encryptedPayload: string;
    maskedPreview: Record<string, unknown>;
  };
  siteInfo: {
    siteName: string;
    siteAddress: Address;
    currency: string;
    is24_7: boolean;
    operatingHours: OperatingHour[];
    holidays: Holiday[];
  };
}

export interface SetupProgressPayload {
  data: Record<string, unknown>;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  businessId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentPayload {
  name?: string;
  description?: string;
  businessId?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  businessId: string;
  departmentId?: string;
  department?: Department;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  businessId?: string;
  departmentId?: string;
}

export interface BusinessSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  businessId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessSettingPayload {
  key?: string;
  value?: string;
  type?: string;
  businessId?: string;
}

export interface BusinessConfiguration {
  id: string;
  key: string;
  value: string;
  businessId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessConfigurationPayload {
  key?: string;
  value?: string;
  businessId?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: string;
  siteId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPayload {
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  category?: string;
  status?: string;
  siteId?: string;
}

export interface Inventory {
  id: string;
  productId: string;
  siteId: string;
  quantity: number;
  minQuantity: number;
  product?: Product;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryPayload {
  productId?: string;
  siteId?: string;
  quantity?: number;
  minQuantity?: number;
}

export interface Sale {
  id: string;
  siteId: string;
  total: number;
  items: unknown[];
  customer?: {
    name: string;
    email: string;
    avatar?: string;
  };
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalePayload {
  siteId?: string;
  total?: number;
  items?: unknown[];
  customer?: {
    name: string;
    email: string;
    avatar?: string;
  };
  status?: string;
}

export interface FileListResponse {
  files: string[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}
