import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { QueryDriverLocationDto } from './dto/query-driver-location.dto';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { TrackingService } from './tracking.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('driver-location')
  updateDriverLocation(@Body() dto: UpdateDriverLocationDto) {
    return this.trackingService.updateDriverLocation(dto);
  }

  @Get('driver-location')
  getLatestDriverLocation(@Query() query: QueryDriverLocationDto) {
    return this.trackingService.getLatestDriverLocation(
      query.tenantId,
      query.driverId,
    );
  }
}
