import api from "@/lib/api";
import { ApiEnvelope } from "./contracts";
import { extractApiError } from "./errors";

const unwrap = <T>(responseData: ApiEnvelope<T> | T): T => {
  if (
    typeof responseData === "object" &&
    responseData !== null &&
    "data" in responseData &&
    "statusCode" in responseData
  ) {
    return (responseData as ApiEnvelope<T>).data;
  }

  return responseData as T;
};

export const apiClient = {
  async get<T>(url: string, params?: object): Promise<T> {
    try {
      const response = await api.get<ApiEnvelope<T> | T>(url, { params });
      return unwrap<T>(response.data);
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async post<TResponse, TRequest = unknown>(
    url: string,
    payload?: TRequest,
    headers?: Record<string, string>,
  ): Promise<TResponse> {
    try {
      const response = await api.post<ApiEnvelope<TResponse> | TResponse>(
        url,
        payload,
        {
          headers,
        },
      );
      return unwrap<TResponse>(response.data);
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async patch<TResponse, TRequest = unknown>(
    url: string,
    payload?: TRequest,
  ): Promise<TResponse> {
    try {
      const response = await api.patch<ApiEnvelope<TResponse> | TResponse>(
        url,
        payload,
      );
      return unwrap<TResponse>(response.data);
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async delete<TResponse>(url: string): Promise<TResponse> {
    try {
      const response = await api.delete<ApiEnvelope<TResponse> | TResponse>(
        url,
      );
      return unwrap<TResponse>(response.data);
    } catch (error) {
      throw extractApiError(error);
    }
  },
};
