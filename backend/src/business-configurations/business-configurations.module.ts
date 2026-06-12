import { Module } from '@nestjs/common';
import { BusinessConfigurationsService } from './business-configurations.service';
import { BusinessConfigurationsController } from './business-configurations.controller';

@Module({
  controllers: [BusinessConfigurationsController],
  providers: [BusinessConfigurationsService],
})
export class BusinessConfigurationsModule {}
