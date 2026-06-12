import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorldpayService } from './worldpay.service';
import { WorldpayController } from './worldpay.controller';
import { Business } from '../setup-business/entities/business.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([Business, User]),
  ],
  providers: [WorldpayService],
  controllers: [WorldpayController],
  exports: [WorldpayService],
})
export class WorldpayModule {}
