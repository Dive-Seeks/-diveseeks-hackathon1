import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupBusinessController } from './setup-business.controller';
import { BusinessesController } from '../businesses/businesses.controller';
import { SetupBusinessService } from './setup-business.service';
import { SetupBusinessListener } from './setup-business.listener';
import { Business } from './entities/business.entity';
import { Address } from './entities/address.entity';
import { Director } from './entities/director.entity';
import { BankDetails } from './entities/bank-details.entity';
import { Store } from './entities/store.entity';
import { OperatingHour } from './entities/operating-hour.entity';
import { Holiday } from './entities/holiday.entity';
import { EmailModule } from '../email/email.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { CompaniesHouseModule } from '../companies-house/companies-house.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      Address,
      Director,
      BankDetails,
      Store,
      OperatingHour,
      Holiday,
      User,
    ]),
    EmailModule,
    GatewaysModule,
    CompaniesHouseModule,
  ],
  controllers: [SetupBusinessController, BusinessesController],
  providers: [SetupBusinessService, SetupBusinessListener],
  exports: [SetupBusinessService],
})
export class SetupBusinessModule {}
