import { Module } from '@nestjs/common';
import { BusinessSettingsService } from './business-settings.service';
import { BusinessSettingsController } from './business-settings.controller';

@Module({
  controllers: [BusinessSettingsController],
  providers: [BusinessSettingsService],
})
export class BusinessSettingsModule {}
