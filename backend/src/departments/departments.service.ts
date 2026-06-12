import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const department = this.departmentRepository.create(createDepartmentDto);
    const savedDepartment = await this.departmentRepository.save(department);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('department_created', savedDepartment);

    return {
      success: true,
      data: savedDepartment,
    };
  }

  async findAll(storeId?: string) {
    const where = storeId ? { businessId: storeId } : undefined;
    const departments = await this.departmentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: departments,
    };
  }

  async findOne(id: string) {
    const department = await this.departmentRepository.findOne({
      where: { id },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return {
      success: true,
      data: department,
    };
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    await this.departmentRepository.update(id, updateDepartmentDto);
    const updatedDepartment = await this.findOne(id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit(
      'department_updated',
      updatedDepartment.data,
    );

    return {
      success: true,
      data: updatedDepartment.data,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.departmentRepository.delete(id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('department_deleted', { id });

    return {
      success: true,
      message: `Department with ID ${id} removed`,
    };
  }
}
