import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Business } from '../../setup-business/entities/business.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('departments')
export class Department {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Sales' })
  @Column()
  name: string;

  @ApiProperty({ example: 'Sales and Marketing department', required: false })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business: Business) => business.departments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
