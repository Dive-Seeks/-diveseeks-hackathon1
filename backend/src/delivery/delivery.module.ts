import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ZonesModule } from '../zones/zones.module';
import { RoutingModule } from '../routing/routing.module';

@Module({
  imports: [ZonesModule, RoutingModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
