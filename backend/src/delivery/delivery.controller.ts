import { Body, Controller, Post } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { CheckDeliveryAvailabilityDto } from './dto/check-delivery-availability.dto';
import { EstimateDeliveryFeeDto } from './dto/estimate-delivery-fee.dto';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('availability')
  checkAvailability(@Body() dto: CheckDeliveryAvailabilityDto) {
    return this.deliveryService.checkAvailability(dto);
  }

  @Post('estimate-fee')
  estimateFee(@Body() dto: EstimateDeliveryFeeDto) {
    return this.deliveryService.estimateFee(dto);
  }
}
