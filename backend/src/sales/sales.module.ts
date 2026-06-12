import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale]), GatewaysModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
