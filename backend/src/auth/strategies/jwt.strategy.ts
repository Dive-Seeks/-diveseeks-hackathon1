import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  userId: string;
  tenantId?: string;
  storeId?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = payload.tenantId || user.tenantId || null;
    const userId = payload.userId;
    // Populate CLS so services can call TenantClsService without @Req()
    // This runs inside JwtAuthGuard, before any controller or route-level guard
    this.cls.set('tenantId', tenantId ?? userId);
    this.cls.set('userId', userId);
    return {
      userId,
      tenantId,
      storeId: payload.storeId || user.storeId,
      role: payload.role || user.role,
    };
  }
}
