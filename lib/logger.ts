/**
 * Centralized frontend logger utility
 * Standardizes console logging across the frontend application.
 */

export const logger = {
  info: (message: string, ...optionalParams: any[]) => {
    console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...optionalParams);
  },
  warn: (message: string, ...optionalParams: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...optionalParams);
  },
  error: (message: string, ...optionalParams: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...optionalParams);
  }
};
