import { Body, Controller, Post } from '@nestjs/common';
import { RouteRequestDto } from './dto/route-request.dto';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('eta')
  eta(@Body() dto: RouteRequestDto) {
    return this.routingService.calculateRoute(dto);
  }
}
