import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountPreference } from './entities/account.entity';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';
import { UpdatePassword } from './dto/update-password/update-password';
import { AccountHealth } from './dto/account-health/account-health';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AccountPreference)
    private readonly accountPreferenceRepository: Repository<AccountPreference>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async findMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isVerified'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = await this.getOrCreatePreferences(userId);

    return {
      success: true,
      data: {
        user,
        preferences,
      },
    };
  }

  async updateMe(userId: string, updateAccountDto: UpdateAccountDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateAccountDto.firstName !== undefined) {
      user.firstName = updateAccountDto.firstName;
    }
    if (updateAccountDto.lastName !== undefined) {
      user.lastName = updateAccountDto.lastName;
    }

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
      },
    };
  }

  async updatePreferences(userId: string, createAccountDto: CreateAccountDto) {
    const preferences = await this.getOrCreatePreferences(userId);
    const nextPreferences = this.accountPreferenceRepository.merge(
      preferences,
      createAccountDto,
    );
    const savedPreferences =
      await this.accountPreferenceRepository.save(nextPreferences);

    return {
      success: true,
      data: savedPreferences,
    };
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePassword) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (updatePasswordDto.currentPassword === updatePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    this.validatePasswordStrength(updatePasswordDto.newPassword);

    const passwordHash = await bcrypt.hash(updatePasswordDto.newPassword, 12);
    user.password = passwordHash;
    user.passwordChangedAt = new Date();
    user.loginAttempts = 0;
    user.lockUntil = null;

    await this.userRepository.save(user);

    return {
      success: true,
      data: {
        message: 'Password updated successfully',
        passwordChangedAt: user.passwordChangedAt,
      },
    };
  }

  async getAccountHealth(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'createdAt',
        'passwordChangedAt',
        'isTwoFactorEnabled',
        'loginAttempts',
        'lockUntil',
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const lastSession = await this.sessionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const recentSessions = await this.sessionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const baselineDate = user.passwordChangedAt ?? user.createdAt;
    const passwordAgeDays = Math.max(
      0,
      Math.floor((Date.now() - baselineDate.getTime()) / 86400000),
    );

    const unusualActivityFlags: string[] = [];
    if (user.loginAttempts >= 3) {
      unusualActivityFlags.push('elevated_failed_logins');
    }
    if (user.lockUntil && user.lockUntil > new Date()) {
      unusualActivityFlags.push('account_temporarily_locked');
    }

    const uniqueRecentIps = new Set(
      recentSessions.map((session) => session.ipAddress).filter(Boolean),
    );
    if (uniqueRecentIps.size >= 3) {
      unusualActivityFlags.push('multiple_recent_login_ips');
    }

    const health: AccountHealth = {
      passwordAgeDays,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      lastLoginAt: lastSession?.createdAt?.toISOString() ?? null,
      lastLoginIp: lastSession?.ipAddress ?? null,
      failedLoginCount: user.loginAttempts,
      unusualActivityFlags,
    };

    return {
      success: true,
      data: health,
    };
  }

  private validatePasswordStrength(password: string) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const minLength = password.length >= 12;

    if (!(hasUpper && hasLower && hasNumber && hasSpecial && minLength)) {
      throw new BadRequestException(
        'New password must be at least 12 characters and include uppercase, lowercase, number, and special character',
      );
    }
  }

  private async getOrCreatePreferences(userId: string) {
    let preferences = await this.accountPreferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.accountPreferenceRepository.create({
        userId,
        theme: 'system',
        timezone: 'UTC',
        language: 'en',
      });
      preferences = await this.accountPreferenceRepository.save(preferences);
    }

    return preferences;
  }
}
