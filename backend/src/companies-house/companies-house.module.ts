import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CompaniesHouseService } from './companies-house.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [CompaniesHouseService],
  exports: [CompaniesHouseService],
})
export class CompaniesHouseModule {}
