import { AxiosError } from "axios";
import { ApiErrorPayload } from "./contracts";

export class ApiClientError extends Error {
  statusCode?: number;
  details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const extractApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    const messageFromPayload = Array.isArray(payload?.message)
      ? payload?.message.join(", ")
      : payload?.message;
    const message =
      messageFromPayload || error.message || "Unexpected API error";
    return new ApiClientError(
      message,
      payload?.statusCode ?? error.response?.status,
      payload,
    );
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message);
  }

  return new ApiClientError("Unknown API error");
};
