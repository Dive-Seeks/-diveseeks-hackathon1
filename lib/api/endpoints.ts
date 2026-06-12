import { paths } from "./generated/schema";
import { apiClient } from "./client";
import {
  BankDetails,
  BusinessesQuery,
  Business,
  BusinessConfiguration,
  BusinessConfigurationPayload,
  BusinessSetting,
  BusinessSettingPayload,
  CompleteSetupPayload,
  Department,
  DepartmentPayload,
  Employee,
  EmployeePayload,
  FileListResponse,
  HealthResponse,
  Inventory,
  InventoryPayload,
  LoginRequest,
  LoginResponse,
  PaginatedData,
  Product,
  ProductPayload,
  RefreshRequest,
  RegisterRequest,
  Sale,
  SalePayload,
  SetupBusinessListQuery,
  Site,
  User,
} from "./contracts";

export type ApiPath = keyof paths;

export const endpointPaths: Record<string, ApiPath> = {
  health: "/api/health",
  login: "/api/auth/login",
  register: "/api/auth/register",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  verifyEmail: "/api/auth/verify-email",
  sendVerificationEmail: "/api/auth/send-verification-email",
  seedTestUser: "/api/auth/seed-test-user",
  deleteAccount: "/api/auth/delete-account",
  setupBusiness: "/api/setup-business",
  businesses: "/api/businesses",
  departments: "/api/departments",
  employees: "/api/employees",
  businessSettings: "/api/business-settings",
  businessConfigurations: "/api/business-configurations",
  sites: "/api/sites",
  products: "/api/products",
  inventory: "/api/inventory",
  sales: "/api/sales",
};

const toApiPath = (path: ApiPath) => path.replace("/api", "");

export const healthApi = {
  get: () => apiClient.get<HealthResponse>(toApiPath(endpointPaths.health)),
};

export const authApi = {
  register: (payload: RegisterRequest) =>
    apiClient.post<{ message?: string; user?: User }, RegisterRequest>(
      toApiPath(endpointPaths.register),
      payload,
    ),

  login: (payload: LoginRequest) =>
    apiClient.post<LoginResponse, LoginRequest>(
      toApiPath(endpointPaths.login),
      payload,
    ),

  refresh: (payload: RefreshRequest) =>
    apiClient.post<
      { accessToken: string; refreshToken: string },
      RefreshRequest
    >(toApiPath(endpointPaths.refresh), payload),

  logout: (refreshToken?: string) =>
    apiClient.post<void, { refreshToken?: string }>(
      toApiPath(endpointPaths.logout),
      {
        refreshToken,
      },
    ),

  me: () => apiClient.get<User>(toApiPath(endpointPaths.me)),

  deleteAccount: () =>
    apiClient.post<void>(toApiPath(endpointPaths.deleteAccount)),

  sendVerificationEmail: (email: string) =>
    apiClient.post<{ message: string }, { email: string }>(
      toApiPath(endpointPaths.sendVerificationEmail),
      { email },
    ),

  verifyEmail: (token: string, userId: string) =>
    apiClient.get<{ message: string }>(toApiPath(endpointPaths.verifyEmail), {
      token,
      userId,
    }),

  seedTestUser: () =>
    apiClient.post<{ message: string }>(toApiPath(endpointPaths.seedTestUser)),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }, { email: string }>(
      toApiPath(endpointPaths.forgotPassword),
      { email },
    ),

  resetPassword: (payload: {
    token: string;
    userId: string;
    newPassword: string;
  }) =>
    apiClient.post<
      { message: string },
      { token: string; userId: string; newPassword: string }
    >(toApiPath(endpointPaths.resetPassword), payload),
};

export const businessesApi = {
  list: (query: BusinessesQuery) =>
    apiClient.get<PaginatedData<Business>>(
      toApiPath(endpointPaths.businesses),
      query,
    ),

  getOne: (id: string) =>
    apiClient.get<Business>(`${toApiPath(endpointPaths.businesses)}/${id}`),

  getRelations: (id: string) =>
    apiClient.get<Business>(
      `${toApiPath(endpointPaths.businesses)}/${id}/relations`,
    ),
};

export const setupBusinessApi = {
  saveProgress: (
    step: number,
    payload: { data: Record<string, unknown> },
    businessId?: string,
  ) =>
    (() => {
      const query = businessId
        ? `?businessId=${encodeURIComponent(businessId)}`
        : "";
      return apiClient.patch<
        { success?: boolean; businessId?: string },
        { data: Record<string, unknown> }
      >(
        `${toApiPath(endpointPaths.setupBusiness)}/progress/${step}${query}`,
        payload,
      );
    })(),

  submit: (payload: CompleteSetupPayload) =>
    apiClient.post<
      { success: boolean; businessId: string },
      CompleteSetupPayload
    >(`${toApiPath(endpointPaths.setupBusiness)}/submit`, payload),

  list: (query?: SetupBusinessListQuery) =>
    apiClient.get<PaginatedData<Business>>(
      toApiPath(endpointPaths.setupBusiness),
      query,
    ),

  getOne: (id: string) =>
    apiClient.get<Business>(`${toApiPath(endpointPaths.setupBusiness)}/${id}`),

  getBankDetails: (id: string) =>
    apiClient.get<BankDetails>(
      `${toApiPath(endpointPaths.setupBusiness)}/${id}/bank-details`,
    ),
};

export const ftpApi = {
  uploadFromFolder: () =>
    apiClient.post<{ success: boolean; uploadedFiles?: string[] }>(
      "/ftp/upload-from-folder",
    ),

  listFiles: (businessId: string, siteId: string | null, type: string) =>
    apiClient.get<FileListResponse>(
      `/ftp/list/${businessId}/${siteId ?? "null"}/${type}`,
    ),

  deleteFile: (
    businessId: string,
    siteId: string | null,
    type: string,
    fileName: string,
  ) =>
    apiClient.delete<{ success: boolean }>(
      `/ftp/delete/${businessId}/${siteId ?? "null"}/${type}/${fileName}`,
    ),

  uploadFile: (
    businessId: string,
    siteId: string | null,
    type: "branding" | "verification" | "reports" | "banners" | "menus",
    file: File,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<{ success: boolean }, FormData>(
      `/ftp/upload/${businessId}/${siteId ?? "null"}/${type}`,
      formData,
      { "Content-Type": "multipart/form-data" },
    );
  },
};

export const departmentsApi = {
  create: (payload: DepartmentPayload) =>
    apiClient.post<Department, DepartmentPayload>(
      toApiPath(endpointPaths.departments),
      payload,
    ),
  list: (siteId?: string) =>
    apiClient.get<Department[]>(toApiPath(endpointPaths.departments), {
      siteId,
    }),
  getOne: (id: string) =>
    apiClient.get<Department>(`${toApiPath(endpointPaths.departments)}/${id}`),
  update: (id: string, payload: DepartmentPayload) =>
    apiClient.patch<Department, DepartmentPayload>(
      `${toApiPath(endpointPaths.departments)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message?: string }>(
      `${toApiPath(endpointPaths.departments)}/${id}`,
    ),
};

export const employeesApi = {
  create: (payload: EmployeePayload) =>
    apiClient.post<Employee, EmployeePayload>(
      toApiPath(endpointPaths.employees),
      payload,
    ),
  list: (businessId?: string) =>
    apiClient.get<Employee[]>(toApiPath(endpointPaths.employees), {
      businessId,
    }),
  getOne: (id: string) =>
    apiClient.get<Employee>(`${toApiPath(endpointPaths.employees)}/${id}`),
  update: (id: string, payload: EmployeePayload) =>
    apiClient.patch<Employee, EmployeePayload>(
      `${toApiPath(endpointPaths.employees)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message?: string }>(
      `${toApiPath(endpointPaths.employees)}/${id}`,
    ),
};

export const businessSettingsApi = {
  create: (payload: BusinessSettingPayload) =>
    apiClient.post<BusinessSetting, BusinessSettingPayload>(
      toApiPath(endpointPaths.businessSettings),
      payload,
    ),
  list: () =>
    apiClient.get<BusinessSetting[]>(toApiPath(endpointPaths.businessSettings)),
  getOne: (id: string) =>
    apiClient.get<BusinessSetting>(
      `${toApiPath(endpointPaths.businessSettings)}/${id}`,
    ),
  update: (id: string, payload: BusinessSettingPayload) =>
    apiClient.patch<BusinessSetting, BusinessSettingPayload>(
      `${toApiPath(endpointPaths.businessSettings)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message?: string }>(
      `${toApiPath(endpointPaths.businessSettings)}/${id}`,
    ),
};

export const businessConfigurationsApi = {
  create: (payload: BusinessConfigurationPayload) =>
    apiClient.post<BusinessConfiguration, BusinessConfigurationPayload>(
      toApiPath(endpointPaths.businessConfigurations),
      payload,
    ),
  list: () =>
    apiClient.get<BusinessConfiguration[]>(
      toApiPath(endpointPaths.businessConfigurations),
    ),
  getOne: (id: string) =>
    apiClient.get<BusinessConfiguration>(
      `${toApiPath(endpointPaths.businessConfigurations)}/${id}`,
    ),
  update: (id: string, payload: BusinessConfigurationPayload) =>
    apiClient.patch<BusinessConfiguration, BusinessConfigurationPayload>(
      `${toApiPath(endpointPaths.businessConfigurations)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message?: string }>(
      `${toApiPath(endpointPaths.businessConfigurations)}/${id}`,
    ),
};

export const sitesApi = {
  list: () => apiClient.get<{ data: Site[]; total: number }>(toApiPath(endpointPaths.sites)),
  getOne: (id: string) =>
    apiClient.get<Site>(`${toApiPath(endpointPaths.sites)}/${id}`),
};

export const productsApi = {
  create: (payload: ProductPayload) =>
    apiClient.post<{ success: boolean; data: Product }, ProductPayload>(
      toApiPath(endpointPaths.products),
      payload,
    ),
  list: (siteId?: string) =>
    apiClient.get<{ success: boolean; data: Product[] }>(
      toApiPath(endpointPaths.products),
      {
        siteId,
      },
    ),
  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Product }>(
      `${toApiPath(endpointPaths.products)}/${id}`,
    ),
  update: (id: string, payload: ProductPayload) =>
    apiClient.patch<{ success: boolean; data: Product }, ProductPayload>(
      `${toApiPath(endpointPaths.products)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `${toApiPath(endpointPaths.products)}/${id}`,
    ),
};

export const inventoryApi = {
  create: (payload: InventoryPayload) =>
    apiClient.post<{ success: boolean; data: Inventory }, InventoryPayload>(
      toApiPath(endpointPaths.inventory),
      payload,
    ),
  list: (siteId?: string) =>
    apiClient.get<{ success: boolean; data: Inventory[] }>(
      toApiPath(endpointPaths.inventory),
      {
        siteId,
      },
    ),
  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Inventory }>(
      `${toApiPath(endpointPaths.inventory)}/${id}`,
    ),
  update: (id: string, payload: InventoryPayload) =>
    apiClient.patch<{ success: boolean; data: Inventory }, InventoryPayload>(
      `${toApiPath(endpointPaths.inventory)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `${toApiPath(endpointPaths.inventory)}/${id}`,
    ),
};

export const salesApi = {
  create: (payload: SalePayload) =>
    apiClient.post<{ success: boolean; data: Sale }, SalePayload>(
      toApiPath(endpointPaths.sales),
      payload,
    ),
  list: (siteId?: string) =>
    apiClient.get<{ success: boolean; data: Sale[] }>(
      toApiPath(endpointPaths.sales),
      { siteId },
    ),
  getOne: (id: string) =>
    apiClient.get<{ success: boolean; data: Sale }>(
      `${toApiPath(endpointPaths.sales)}/${id}`,
    ),
  update: (id: string, payload: SalePayload) =>
    apiClient.patch<{ success: boolean; data: Sale }, SalePayload>(
      `${toApiPath(endpointPaths.sales)}/${id}`,
      payload,
    ),
  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `${toApiPath(endpointPaths.sales)}/${id}`,
    ),
};
