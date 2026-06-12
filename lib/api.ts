import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "./auth-store";

const DEFAULT_API_BASE_URL_BROWSER = "/api";
const DEFAULT_API_BASE_URL_SERVER = "http://127.0.0.1:7771/api";

const getDefaultApiBaseUrl = () =>
  typeof window === "undefined"
    ? DEFAULT_API_BASE_URL_SERVER
    : DEFAULT_API_BASE_URL_BROWSER;

export const resolveApiBaseUrl = (rawValue?: string) => {
  const value = (rawValue || getDefaultApiBaseUrl()).trim();

  if (value.startsWith("/")) {
    const normalizedRelative = value.replace(/\/+$/, "");
    return normalizedRelative || "/api";
  }

  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = !pathname || pathname === "/" ? "/api" : pathname;
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return getDefaultApiBaseUrl();
  }
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 60000, // Increase timeout to 60 seconds for large file uploads
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const userId = useAuthStore.getState().user?.id;
        if (!refreshToken || !userId) {
          throw new Error("Missing authentication data for token refresh");
        }

        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {
            refreshToken,
            userId,
          },
        );

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        // Update the store
        const user = useAuthStore.getState().user;
        if (user) {
          useAuthStore.getState().setAuth(user, accessToken, newRefreshToken);
        }

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
