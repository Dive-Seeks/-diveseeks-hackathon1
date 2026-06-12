import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  authApi,
  businessesApi,
  businessConfigurationsApi,
  businessSettingsApi,
  departmentsApi,
  employeesApi,
  inventoryApi,
  productsApi,
  salesApi,
  setupBusinessApi,
  sitesApi,
} from "./endpoints";
import {
  BusinessesQuery,
  Business,
  BusinessConfiguration,
  BusinessConfigurationPayload,
  BusinessSetting,
  BusinessSettingPayload,
  Department,
  DepartmentPayload,
  Employee,
  EmployeePayload,
  Inventory,
  InventoryPayload,
  LoginRequest,
  LoginResponse,
  Product,
  ProductPayload,
  RegisterRequest,
  Sale,
  SalePayload,
  Site,
  User,
} from "./contracts";

export const queryKeys = {
  auth: ["auth"] as const,
  me: ["auth", "me"] as const,
  businesses: (query: BusinessesQuery) => ["businesses", query] as const,
  business: (id: string) => ["businesses", id] as const,
  setupBusinesses: (page?: number, limit?: number) =>
    ["setup-business", page, limit] as const,
  setupBusiness: (id: string) => ["setup-business", id] as const,
  departments: (siteId?: string) => ["departments", siteId] as const,
  department: (id: string) => ["departments", id] as const,
  employees: (businessId?: string) => ["employees", businessId] as const,
  employee: (id: string) => ["employees", id] as const,
  businessSettings: ["business-settings"] as const,
  businessSetting: (id: string) => ["business-settings", id] as const,
  businessConfigurations: ["business-configurations"] as const,
  businessConfiguration: (id: string) =>
    ["business-configurations", id] as const,
  sites: ["sites"] as const,
  site: (id: string) => ["sites", id] as const,
  products: (siteId?: string) => ["products", siteId] as const,
  product: (id: string) => ["products", id] as const,
  inventory: (siteId?: string) => ["inventory", siteId] as const,
  inventoryItem: (id: string) => ["inventory", id] as const,
  sales: (siteId?: string) => ["sales", siteId] as const,
  sale: (id: string) => ["sales", id] as const,
};

export const useMeQuery = (
  options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.me,
    queryFn: () => authApi.me(),
    ...options,
  });

export const useBusinessesQuery = (
  query: BusinessesQuery,
  options?: Omit<
    UseQueryOptions<{ data: Business[]; meta: unknown }>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.businesses(query),
    queryFn: () => businessesApi.list(query),
    ...options,
  });

export const useBusinessQuery = (
  id: string,
  options?: Omit<UseQueryOptions<Business>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.business(id),
    queryFn: () => businessesApi.getOne(id),
    enabled: Boolean(id),
    ...options,
  });

export const useSetupBusinessesQuery = (
  page?: number,
  limit?: number,
  options?: Omit<
    UseQueryOptions<{ data: Business[]; meta: unknown }>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.setupBusinesses(page, limit),
    queryFn: () => setupBusinessApi.list({ page, limit }),
    ...options,
  });

export const useSitesQuery = (
  options?: Omit<UseQueryOptions<{ data: Site[]; total: number }>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.sites,
    queryFn: () => sitesApi.list(),
    ...options,
  });

export const useDepartmentsQuery = (
  siteId?: string,
  options?: Omit<UseQueryOptions<Department[]>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.departments(siteId),
    queryFn: () => departmentsApi.list(siteId),
    ...options,
  });

export const useEmployeesQuery = (
  businessId?: string,
  options?: Omit<UseQueryOptions<Employee[]>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.employees(businessId),
    queryFn: () => employeesApi.list(businessId),
    ...options,
  });

export const useBusinessSettingsQuery = (
  options?: Omit<UseQueryOptions<BusinessSetting[]>, "queryKey" | "queryFn">,
) =>
  useQuery({
    queryKey: queryKeys.businessSettings,
    queryFn: () => businessSettingsApi.list(),
    ...options,
  });

export const useBusinessConfigurationsQuery = (
  options?: Omit<
    UseQueryOptions<BusinessConfiguration[]>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.businessConfigurations,
    queryFn: () => businessConfigurationsApi.list(),
    ...options,
  });

export const useProductsQuery = (
  siteId?: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; data: Product[] }>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.products(siteId),
    queryFn: () => productsApi.list(siteId),
    ...options,
  });

export const useInventoryQuery = (
  siteId?: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; data: Inventory[] }>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.inventory(siteId),
    queryFn: () => inventoryApi.list(siteId),
    ...options,
  });

export const useSalesQuery = (
  siteId?: string,
  options?: Omit<
    UseQueryOptions<{ success: boolean; data: Sale[] }>,
    "queryKey" | "queryFn"
  >,
) =>
  useQuery({
    queryKey: queryKeys.sales(siteId),
    queryFn: () => salesApi.list(siteId),
    ...options,
  });

export const useLoginMutation = (
  options?: UseMutationOptions<LoginResponse, Error, LoginRequest>,
) =>
  useMutation({ mutationFn: (payload) => authApi.login(payload), ...options });

export const useRegisterMutation = (
  options?: UseMutationOptions<
    { message?: string; user?: User },
    Error,
    RegisterRequest
  >,
) =>
  useMutation({
    mutationFn: (payload) => authApi.register(payload),
    ...options,
  });

export const useForgotPasswordMutation = (
  options?: UseMutationOptions<{ message: string }, Error, { email: string }>,
) =>
  useMutation({
    mutationFn: ({ email }) => authApi.forgotPassword(email),
    ...options,
  });

export const useResetPasswordMutation = (
  options?: UseMutationOptions<
    { message: string },
    Error,
    { token: string; userId: string; newPassword: string }
  >,
) =>
  useMutation({
    mutationFn: (payload) => authApi.resetPassword(payload),
    ...options,
  });

export const useCreateDepartmentMutation = (
  options?: UseMutationOptions<Department, Error, DepartmentPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => departmentsApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateDepartmentMutation = (
  options?: UseMutationOptions<
    Department,
    Error,
    { id: string; payload: DepartmentPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => departmentsApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.department(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteDepartmentMutation = (
  options?: UseMutationOptions<
    { success: boolean; message?: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => departmentsApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.removeQueries({
        queryKey: queryKeys.department(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateEmployeeMutation = (
  options?: UseMutationOptions<Employee, Error, EmployeePayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateEmployeeMutation = (
  options?: UseMutationOptions<
    Employee,
    Error,
    { id: string; payload: EmployeePayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeesApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.employee(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteEmployeeMutation = (
  options?: UseMutationOptions<
    { success: boolean; message?: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => employeesApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.removeQueries({ queryKey: queryKeys.employee(variables.id) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateBusinessSettingMutation = (
  options?: UseMutationOptions<BusinessSetting, Error, BusinessSettingPayload>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => businessSettingsApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessSettings });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateBusinessSettingMutation = (
  options?: UseMutationOptions<
    BusinessSetting,
    Error,
    { id: string; payload: BusinessSettingPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => businessSettingsApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessSettings });
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessSetting(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteBusinessSettingMutation = (
  options?: UseMutationOptions<
    { success: boolean; message?: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => businessSettingsApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.businessSettings });
      queryClient.removeQueries({
        queryKey: queryKeys.businessSetting(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateBusinessConfigurationMutation = (
  options?: UseMutationOptions<
    BusinessConfiguration,
    Error,
    BusinessConfigurationPayload
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => businessConfigurationsApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessConfigurations,
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateBusinessConfigurationMutation = (
  options?: UseMutationOptions<
    BusinessConfiguration,
    Error,
    { id: string; payload: BusinessConfigurationPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      businessConfigurationsApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessConfigurations,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessConfiguration(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteBusinessConfigurationMutation = (
  options?: UseMutationOptions<
    { success: boolean; message?: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => businessConfigurationsApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.businessConfigurations,
      });
      queryClient.removeQueries({
        queryKey: queryKeys.businessConfiguration(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateProductMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Product },
    Error,
    ProductPayload
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => productsApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateProductMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Product },
    Error,
    { id: string; payload: ProductPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => productsApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.product(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteProductMutation = (
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => productsApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.removeQueries({ queryKey: queryKeys.product(variables.id) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateInventoryMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Inventory },
    Error,
    InventoryPayload
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => inventoryApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateInventoryMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Inventory },
    Error,
    { id: string; payload: InventoryPayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => inventoryApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryItem(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteInventoryMutation = (
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => inventoryApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.removeQueries({
        queryKey: queryKeys.inventoryItem(variables.id),
      });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useCreateSaleMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Sale },
    Error,
    SalePayload
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => salesApi.create(payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useUpdateSaleMutation = (
  options?: UseMutationOptions<
    { success: boolean; data: Sale },
    Error,
    { id: string; payload: SalePayload }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => salesApi.update(id, payload),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.sale(variables.id) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};

export const useDeleteSaleMutation = (
  options?: UseMutationOptions<
    { success: boolean; message: string },
    Error,
    { id: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => salesApi.remove(id),
    onSuccess: (data, variables, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.removeQueries({ queryKey: queryKeys.sale(variables.id) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
};
