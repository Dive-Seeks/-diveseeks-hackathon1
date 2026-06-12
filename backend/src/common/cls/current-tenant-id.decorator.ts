import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts tenantId from the CLS store (set by TenantScopeGuard).
 * Falls back to request.user.tenantId for backward compatibility.
 */
export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId ?? null;
  },
);
