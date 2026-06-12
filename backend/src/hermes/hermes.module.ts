import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBehaviorSignal } from './entities/user-behavior-signal.entity';
import { UserBehaviorAlert } from './entities/user-behavior-alert.entity';
import { HermesGateway } from './hermes.gateway';
import { HermesService } from './hermes.service';
import { HermesReporterService } from './hermes-reporter.service';
import { HermesController } from './hermes.controller';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserBehaviorSignal, UserBehaviorAlert]),
    GatewaysModule,
  ],
  controllers: [HermesController],
  providers: [HermesGateway, HermesService, HermesReporterService],
  exports: [HermesService, HermesGateway],
})
export class HermesModule {}
