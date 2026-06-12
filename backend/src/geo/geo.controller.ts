import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { GeoService } from './geo.service';
import { GeocodeAddressDto } from './dto/geocode-address.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';

@SkipThrottle()
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post('geocode')
  geocode(@Body() dto: GeocodeAddressDto) {
    return this.geoService.geocodeAddress(dto);
  }

  @Post('reverse-geocode')
  reverseGeocode(@Body() dto: ReverseGeocodeDto) {
    return this.geoService.reverseGeocode(dto);
  }

  @Get('autocomplete')
  autocomplete(@Query() dto: AutocompleteQueryDto) {
    return this.geoService.autocomplete(dto);
  }
}
