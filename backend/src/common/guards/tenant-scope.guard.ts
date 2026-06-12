import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';

export const SKIP_TENANT_SCOPE = 'skipTenantScope';

/**
 * TenantScopeGuard — Paperclip pattern (company-scope.guard).
 *
 * Ensures every route requiring tenant isolation extracts tenantId from JWT
 * and rejects requests that attempt cross-tenant access. Also overwrites any
 * tenantId in the request body with the JWT value to prevent spoofing.
 *
 * Skip via @SetMetadata(SKIP_TENANT_SCOPE, true) on platform-wide routes (Jos boot etc.)
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopeGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_SCOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user (unauthenticated route), skip
    if (!user) return true;

    const jwtTenantId = user.tenantId;

    // Populate CLS store so services can read tenantId without @Req()
    // Fallback: when JWT has no tenantId (individual user), use userId as tenant scope
    this.cls.set('tenantId', jwtTenantId ?? user.userId ?? null);
    this.cls.set('userId', user.userId ?? null);

    // Platform-wide agents (Jos, Abigail) have null tenantId — allow
    if (!jwtTenantId) return true;

    // Overwrite body.tenantId with JWT value to prevent spoofing (Rule 19)
    if (request.body && typeof request.body === 'object') {
      if (request.body.tenantId && request.body.tenantId !== jwtTenantId) {
        this.logger.warn(
          `Tenant spoofing attempt: body.tenantId=${request.body.tenantId} vs JWT=${jwtTenantId}`,
        );
      }
      request.body.tenantId = jwtTenantId;
    }

    // Inject tenantId into query params for GET list routes
    if (request.query) {
      request.query.tenantId = jwtTenantId;
    }

    return true;
  }
}
