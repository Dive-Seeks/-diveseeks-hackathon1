import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || '';
    const device = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ipAddress, device);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Body('userId') userId: string,
  ) {
    if (!refreshToken || !userId) {
      throw new UnauthorizedException('Missing refresh token or user id');
    }
    return this.authService.refresh(refreshToken, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request & { user: { userId: string } },
    @Body('refreshToken') refreshToken: string,
  ) {
    await this.authService.logout(req.user.userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new UnauthorizedException();

    // Remove password before returning
    const result = { ...user };
    delete (result as Partial<typeof user>).password;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('delete-account')
  async deleteAccount(@Req() req: Request & { user: { userId: string } }) {
    await this.usersService.remove(req.user.userId);
  }

  @Post('send-verification-email')
  async sendVerificationEmail(@Body('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      await this.authService.sendVerificationEmail(user);
    }
    return {
      message: 'If the user exists, a verification email has been sent.',
    };
  }

  @Get('verify-email')
  async verifyEmail(
    @Query('token') token: string,
    @Query('userId') userId: string,
  ) {
    return this.authService.verifyEmail(token, userId);
  }

  @Post('seed-test-user')
  @HttpCode(HttpStatus.OK)
  async seedTestUser(@Body() body: any = {}) {
    try {
      await this.authService.register({
        email: body.email || 'diveseeks@gmail.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });
      // Automatically verify it for the test
      const user = await this.usersService.findByEmail(
        body.email || 'diveseeks@gmail.com',
      );
      if (user) {
        await this.usersService.update(user.id, {
          isVerified: true,
          tenantId: '11111111-1111-4111-a111-111111111111',
        });
        if (body.businessType) {
          // Create a business with the specified type for testing
          await this.usersService['userRepository'].query(
            `INSERT INTO businesses (id, name, "companyName", "businessType", "companyEmail", "companyPhone", region, type, user_id) 
             VALUES ($1, 'Test Business', 'Test Ltd', 'Limited Company', 'test@test.com', '123', 'United Kingdom', $2, $3)`,
            [
              '11111111-1111-4111-a111-111111111111',
              body.businessType,
              user.id,
            ],
          );
        }
      }
      return { message: 'Test user seeded successfully' };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 409
      ) {
        // Clean up test state for the user to avoid cross-test pollution
        const user = await this.usersService.findByEmail(
          body.email || 'diveseeks@gmail.com',
        );
        const fallbackTenant = '00000000-0000-0000-0000-000000000000';
        try {
          if (user) {
            await this.usersService.update(user.id, {
              tenantId: '11111111-1111-4111-a111-111111111111',
            });
          }
          await this.usersService['userRepository'].query(
            'DELETE FROM ad_campaigns WHERE tenant_id = $1 OR tenant_id = $2',
            [user?.tenantId, fallbackTenant],
          );
          await this.usersService['userRepository'].query(
            'DELETE FROM ad_budgets WHERE tenant_id = $1 OR tenant_id = $2',
            [user?.tenantId, fallbackTenant],
          );
          if (body.businessType && user) {
            const res = await this.usersService['userRepository'].query(
              'UPDATE businesses SET type = $1 WHERE user_id = $2',
              [body.businessType, user.id],
            );
            if (res[1] === 0) {
              await this.usersService['userRepository'].query(
                `INSERT INTO businesses (id, name, "companyName", "businessType", "companyEmail", "companyPhone", region, type, user_id) 
                 VALUES ($1, 'Test Business', 'Test Ltd', 'Limited Company', 'test@test.com', '123', 'United Kingdom', $2, $3)`,
                [
                  '11111111-1111-4111-a111-111111111111',
                  body.businessType,
                  user.id,
                ],
              );
            }
          }
        } catch (e) {
          console.error('Failed to cleanup ad state', e);
        }
        return { message: 'Test user already exists, cleaned up ad state' };
      }
      throw error;
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
