import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Per-tenant throttler. Uses tenantId as the key when available so one
 * tenant cannot exhaust the global rate limit for others. Falls back to
 * IP when tenantId is absent (unauthenticated routes).
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req['user'] as { tenantId?: string } | undefined;
    if (user?.tenantId) {
      return `tenant:${user.tenantId}`;
    }
    // fallback to IP
    const ip =
      (req['ip'] as string) ||
      ((req['headers'] as Record<string, string>)?.['x-forwarded-for'] ??
        'unknown');
    return ip;
  }

  protected throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException('Too Many Requests');
  }
}
