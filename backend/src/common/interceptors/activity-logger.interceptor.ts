import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityService } from '../../activity/activity.service';

/**
 * ActivityLoggerInterceptor — Paperclip pattern.
 * Auto-logs every mutation (POST/PATCH/PUT/DELETE) to the immutable activity_log.
 * Apply at controller or route level on mutation endpoints.
 */
@Injectable()
export class ActivityLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLoggerInterceptor.name);

  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const action = `${method} ${request.route?.path ?? request.url}`;
    const actor = request.user?.id ?? 'system';
    const tenantId = request.user?.tenantId ?? request.body?.tenantId ?? null;

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.activityService
            .log({
              tenantId,
              agentId: request.body?.agentId ?? data?.data?.id ?? null,
              issueId: request.params?.id ?? null,
              actor,
              action,
              payload: {
                params: request.params,
                body: this.sanitiseBody(request.body),
              },
            })
            .catch((err) =>
              this.logger.error(`Failed to log activity: ${err.message}`),
            );
        },
        error: () => {
          // Don't log failed requests to activity log
        },
      }),
    );
  }

  private sanitiseBody(body: Record<string, any>): Record<string, any> {
    if (!body) return {};
    const sanitised = { ...body };
    // Remove sensitive fields
    delete sanitised.password;
    delete sanitised.apiKey;
    delete sanitised.token;
    return sanitised;
  }
}
