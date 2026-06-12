export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxAttempts = 3,
  delayMs = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err: any) {
      lastError = err;
      const status = err?.statusCode || err?.response?.status || err?.status;
      if ((err?.isRetryable || status === 429 || status === 503) && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
