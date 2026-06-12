import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    const employee = this.employeeRepository.create(createEmployeeDto);
    const savedEmployee = await this.employeeRepository.save(employee);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('employee_created', savedEmployee);

    return {
      success: true,
      data: savedEmployee,
    };
  }

  async findAll(businessId?: string) {
    const where = businessId ? { businessId } : {};
    const employees = await this.employeeRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: employees,
    };
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return {
      success: true,
      data: employee,
    };
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.employeeRepository.update(id, updateEmployeeDto);
    const updatedEmployee = await this.findOne(id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('employee_updated', updatedEmployee.data);

    return {
      success: true,
      data: updatedEmployee.data,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.employeeRepository.delete(id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('employee_deleted', { id });

    return {
      success: true,
      message: `Employee with ID ${id} removed`,
    };
  }
}
