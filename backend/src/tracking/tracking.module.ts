import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { DriverTrackingGateway } from './driver-tracking/driver-tracking.gateway';

@Module({
  controllers: [TrackingController],
  providers: [TrackingService, DriverTrackingGateway],
  exports: [TrackingService],
})
export class TrackingModule {}
