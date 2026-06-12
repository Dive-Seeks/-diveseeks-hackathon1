import { Injectable } from '@nestjs/common';
import { CheckDeliveryAvailabilityDto } from './dto/check-delivery-availability.dto';
import { EstimateDeliveryFeeDto } from './dto/estimate-delivery-fee.dto';
import { RoutingService } from '../routing/routing.service';
import { ZonesService } from '../zones/zones.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly zonesService: ZonesService,
    private readonly routingService: RoutingService,
  ) {}

  async checkAvailability(dto: CheckDeliveryAvailabilityDto) {
    const availability = await this.zonesService.checkPoint({
      tenantId: dto.tenantId,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    return {
      available: availability.available,
      zone: availability.zone,
    };
  }

  async estimateFee(dto: EstimateDeliveryFeeDto) {
    const route = await this.routingService.calculateRoute({
      originLatitude: dto.originLatitude,
      originLongitude: dto.originLongitude,
      destinationLatitude: dto.destinationLatitude,
      destinationLongitude: dto.destinationLongitude,
      mode: 'driving',
    });

    const baseFee = dto.baseFee ?? 2.5;
    const perKmFee = dto.perKmFee ?? 0.8;
    const distanceKm = route.distanceMeters / 1000;
    const fee = Number((baseFee + distanceKm * perKmFee).toFixed(2));

    return {
      fee,
      currency: 'GBP',
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      provider: route.provider,
    };
  }
}
