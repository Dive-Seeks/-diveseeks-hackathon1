import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const request = context.switchToHttp().getRequest();
    console.log(
      `[TransformInterceptor] REQUEST: ${request.method} ${request.url}`,
    );
    return next.handle().pipe(
      map((data: T) => {
        console.log(
          `[TransformInterceptor] RESPONSE: ${request.method} ${request.url} - Status: ${response.statusCode}`,
        );
        return {
          data,
          statusCode: response.statusCode,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
