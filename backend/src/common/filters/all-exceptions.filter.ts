import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(
        `Http Status: ${status} Error Message: ${JSON.stringify(responseBody)}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `Http Status: ${status} Info: ${JSON.stringify(responseBody)}`,
      );
    }

    const errorCode =
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'errorCode' in responseBody
        ? (responseBody as Record<string, unknown>).errorCode
        : undefined;

    const message =
      typeof responseBody === 'object' && responseBody !== null
        ? (responseBody as Record<string, unknown>).message || responseBody
        : responseBody;

    response.status(status).json({
      statusCode: status,
      errorCode: errorCode as string | undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message as string | object,
    });
  }
}
