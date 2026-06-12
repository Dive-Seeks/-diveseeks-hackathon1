import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // Skip internal tracking routes
    const url = request.url;
    if (url.includes('/health') || url.includes('/metrics')) {
      return next.handle();
    }

    const method = request.method;
    // Use path pattern if available, otherwise fallback to url
    const route = ((request as any).route?.path as string) || url;
    const start = Date.now();

    this.metricsService.getHttpInFlightGauge().inc();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        this.metricsService.getHttpCounter().inc({
          method,
          route,
          status_code: statusCode,
        });
      }),
      finalize(() => {
        this.metricsService.getHttpInFlightGauge().dec();
        const duration = (Date.now() - start) / 1000;
        this.metricsService.getHttpHistogram().observe(
          {
            method,
            route,
          },
          duration,
        );
      }),
    );
  }
}
