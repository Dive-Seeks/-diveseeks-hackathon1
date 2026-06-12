import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { User } from '../users/entities/user.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(EmailVerification)
    private readonly emailVerificationRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectQueue('email_queue')
    private readonly emailQueue: Queue,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    await this.sendVerificationEmail(user);
    return {
      message: 'User registered. Please check your email for verification.',
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, device: string) {
    const email = loginDto.email.toLowerCase().trim();
    const { password } = loginDto;
    console.log(
      `AuthService: Login attempt for email: '${email}' (length: ${email.length})`,
    );
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.warn(`AuthService: User not found: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      console.warn(`AuthService: Account locked for user: ${email}`);
      const waitTime = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new ForbiddenException(
        `Account is temporarily locked. Please try again in ${waitTime} minutes`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn(`AuthService: Invalid password for user: ${email}`);
      // Increment login attempts
      const attempts = user.loginAttempts + 1;
      const updateData: Partial<User> = { loginAttempts: attempts };

      if (attempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.lockUntil = lockUntil;
      }

      await this.usersService.update(user.id, updateData);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      console.warn(`AuthService: Email not verified for user: ${email}`);
      throw new ForbiddenException('Please verify your email first');
    }

    console.log(`AuthService: Successful login for user: ${email}`);

    // Reset login attempts on success
    if (user.loginAttempts > 0 || user.lockUntil) {
      await this.usersService.update(user.id, {
        loginAttempts: 0,
        lockUntil: null,
      });
    }

    const tokens = await this.generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionsService.createSession(
      user.id,
      tokens.refreshToken,
      expiresAt,
      device,
      ipAddress,
    );

    console.log(`AuthService: Session created for userId: ${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        role: user.role,
        tenantId: user.tenantId,
        storeId: user.storeId,
        isCoder: user.isCoder,
        isBusiness: user.isBusiness,
      },
    };
  }

  async refresh(refreshToken: string, userId: string) {
    const session = await this.sessionsService.validateRefreshToken(
      userId,
      refreshToken,
    );
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();

    const tokens = await this.generateTokens(user);

    // Update existing session with new refresh token hash
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update the current session instead of creating a new one to rotate the token
    await this.sessionsService.removeSession(userId, refreshToken);
    await this.sessionsService.createSession(
      userId,
      tokens.refreshToken,
      expiresAt,
      session.device,
      session.ipAddress,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    await this.sessionsService.removeSession(userId, refreshToken);
  }

  async generateTokens(user: User) {
    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      storeId: user.storeId,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ||
        '1d') as JwtSignOptions['expiresIn'],
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret:
        this.configService.get<string>('JWT_SECRET_REFRESH') ||
        this.configService.get<string>('JWT_SECRET'),
    });

    return { accessToken, refreshToken };
  }

  async sendVerificationEmail(user: User) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.emailVerificationRepository.delete({ userId: user.id });
    await this.emailVerificationRepository.save({
      userId: user.id,
      verificationTokenHash: hash,
      expiresAt,
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:7777';
    const url = `${frontendUrl}/verify-email?token=${token}&userId=${user.id}`;

    await this.emailQueue.add('send-email', {
      to: user.email,
      subject: 'Verify your email',
      template: 'verify-email',
      context: { url },
    });
  }

  async verifyEmail(token: string, userId: string) {
    console.log(
      `AuthService: Verifying email for userId: ${userId}, token: ${token}`,
    );
    const verification = await this.emailVerificationRepository.findOne({
      where: { userId, expiresAt: MoreThan(new Date()) },
    });

    if (
      !verification ||
      !(await bcrypt.compare(token, verification.verificationTokenHash))
    ) {
      console.warn(`AuthService: Verification failed for userId: ${userId}`);
      throw new BadRequestException('Invalid or expired verification token');
    }

    console.log(`AuthService: Verification successful for userId: ${userId}`);
    await this.usersService.update(userId, { isVerified: true });
    await this.emailVerificationRepository.delete({ userId });

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user)
      return { message: 'If the email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.passwordResetRepository.delete({ userId: user.id });
    await this.passwordResetRepository.save({
      userId: user.id,
      resetTokenHash: hash,
      expiresAt,
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:7777';
    const url = `${frontendUrl}/reset-password?token=${token}&userId=${user.id}`;

    await this.emailQueue.add('send-email', {
      to: user.email,
      subject: 'Reset your password',
      template: 'reset-password',
      context: { url },
    });

    return { message: 'If the email exists, a reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, userId, newPassword } = resetPasswordDto;
    console.log(
      `AuthService: Resetting password for userId: ${userId}, token: ${token}`,
    );
    const reset = await this.passwordResetRepository.findOne({
      where: { userId, expiresAt: MoreThan(new Date()) },
    });

    if (!reset) {
      console.warn(
        `AuthService: No valid reset record found for userId: ${userId}`,
      );
      throw new BadRequestException('Invalid or expired reset token');
    }

    const isMatch = await bcrypt.compare(token, reset.resetTokenHash);
    if (!isMatch) {
      console.warn(`AuthService: Reset token mismatch for userId: ${userId}`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, {
      password: hashedPassword,
      isVerified: true,
      passwordChangedAt: new Date(),
    });

    // Clean up
    await this.passwordResetRepository.delete({ userId });
    await this.emailVerificationRepository.delete({ userId });

    return { message: 'Password reset successfully' };
  }
}
