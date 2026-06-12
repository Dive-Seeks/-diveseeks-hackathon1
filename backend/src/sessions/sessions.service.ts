import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from './entities/session.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    device?: string,
    ipAddress?: string,
  ): Promise<Session> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const session = this.sessionRepository.create({
      userId,
      refreshTokenHash,
      expiresAt,
      device,
      ipAddress,
    });
    return this.sessionRepository.save(session);
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<Session> {
    const activeSessions = await this.sessionRepository.find({
      where: { userId },
    });

    for (const session of activeSessions) {
      // Skip expired sessions
      if (session.expiresAt <= new Date()) {
        continue;
      }

      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (isMatch) {
        return session;
      }
    }

    throw new UnauthorizedException('Invalid refresh token');
  }

  async removeSession(userId: string, refreshToken: string): Promise<void> {
    const activeSessions = await this.sessionRepository.find({
      where: { userId },
    });

    for (const session of activeSessions) {
      const isMatch = await bcrypt.compare(
        refreshToken,
        session.refreshTokenHash,
      );
      if (isMatch) {
        await this.sessionRepository.remove(session);
        return;
      }
    }
  }

  async removeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.delete({ userId });
  }
}
