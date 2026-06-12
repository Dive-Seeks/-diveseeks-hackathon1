import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CheckZonePointDto } from './dto/check-zone-point.dto';
import { CreateZoneDto } from './dto/create-zone.dto';
import { QueryZonesDto } from './dto/query-zones.dto';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.createZone(dto);
  }

  @Get()
  list(@Query() query: QueryZonesDto) {
    return this.zonesService.listZones(query);
  }

  @Post('check-point')
  checkPoint(@Body() dto: CheckZonePointDto) {
    return this.zonesService.checkPoint(dto);
  }
}
