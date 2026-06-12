import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorDetails {
  code: string;
  message: string;
  description?: string;
}

export class BusinessSetupException extends HttpException {
  constructor(
    error: ErrorDetails,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        errorCode: error.code,
        message: error.message,
        description: error.description,
      },
      status,
    );
  }
}
