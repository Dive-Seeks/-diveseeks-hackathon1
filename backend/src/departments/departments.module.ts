import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { Department } from './entities/department.entity';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department]), GatewaysModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
