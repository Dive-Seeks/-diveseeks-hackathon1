import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { Store } from '../setup-business/entities/store.entity';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [TypeOrmModule.forFeature([Store]), GatewaysModule],
  providers: [StoresService],
  controllers: [StoresController],
  exports: [StoresService],
})
export class StoresModule {}
