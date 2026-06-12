import { Injectable, ExecutionContext, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ERROR_CODES } from '../../setup-business/constants/error-codes';
import { BusinessSetupException } from '../../setup-business/exceptions/business-setup.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ||
        new BusinessSetupException(
          ERROR_CODES.UNAUTHORIZED,
          HttpStatus.UNAUTHORIZED,
        )
      );
    }
    return user;
  }
}
