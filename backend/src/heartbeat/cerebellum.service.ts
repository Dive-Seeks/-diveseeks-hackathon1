import { Injectable, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export interface CerebellumResult<T> {
  output: T;
  usedFallback: boolean;
  attempts: number;
}

@Injectable()
export class CerebellumService {
  private readonly logger = new Logger(CerebellumService.name);

  async validate<T>(
    rawOutput: unknown,
    schema: ZodSchema<T>,
    domain: string,
    templateFallback: T,
  ): Promise<CerebellumResult<T>> {
    // Attempt 1: direct parse
    const attempt1 = schema.safeParse(rawOutput);
    if (attempt1.success) {
      return { output: attempt1.data, usedFallback: false, attempts: 1 };
    }

    this.logger.warn(
      `Cerebellum attempt 1 failed for ${domain}: ${attempt1.error.message}`,
    );

    // Attempt 2: auto-correct (strip extra fields, coerce types)
    const corrected = this.autoCorrect(rawOutput, attempt1.error);
    const attempt2 = schema.safeParse(corrected);
    if (attempt2.success) {
      return { output: attempt2.data, usedFallback: false, attempts: 2 };
    }

    this.logger.warn(
      `Cerebellum attempt 2 failed for ${domain}: ${attempt2.error.message}`,
    );

    // Attempt 3: template fallback — never return empty
    this.logger.error(
      `Cerebellum using template fallback for domain: ${domain}`,
    );
    return { output: templateFallback, usedFallback: true, attempts: 3 };
  }

  private autoCorrect(raw: unknown, error: ZodError): unknown {
    if (typeof raw !== 'object' || raw === null) return raw;
    const obj = { ...(raw as Record<string, unknown>) };

    // Remove fields that caused issues
    for (const issue of error.issues) {
      if (issue.path.length > 0) {
        const key = issue.path[0] as string;
        // Coerce string numbers
        if (issue.code === 'invalid_type' && issue.expected === 'number') {
          const val = obj[key];
          if (typeof val === 'string' && !isNaN(Number(val))) {
            obj[key] = Number(val);
          }
        }
      }
    }
    return obj;
  }
}
