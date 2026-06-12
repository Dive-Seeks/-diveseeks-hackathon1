import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../setup-business/entities/business.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('employees')
export class Employee {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Jane' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Column()
  lastName: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @Column()
  email: string;

  @ApiProperty({ example: '+447700900002' })
  @Column()
  phone: string;

  @ApiProperty({ example: 'Manager' })
  @Column()
  role: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business: Business) => business.employees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @ManyToOne(
    () => Department,
    (department: Department) => department.employees,
    { nullable: true },
  )
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
