import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { AccountPreference } from './entities/account.entity';
import { User } from '../users/entities/user.entity';
import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountPreference, User, Session])],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
