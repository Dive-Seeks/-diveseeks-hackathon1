// API envelope — all backend responses use this shape
export interface ApiResponse<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  statusCode: number;
  timestamp: string;
}

// Tenant hierarchy
export interface TenantRef {
  id: string;
  name: string;
}

export interface StoreRef {
  id: string;
  tenantId: string;
  name: string;
}
