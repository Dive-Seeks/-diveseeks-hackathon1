import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { Employee } from './entities/employee.entity';
import { GatewaysModule } from '../gateways/gateways.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), GatewaysModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
