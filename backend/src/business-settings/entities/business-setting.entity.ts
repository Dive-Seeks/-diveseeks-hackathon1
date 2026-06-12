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

@Entity('business_settings')
export class BusinessSetting {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'tax_rate' })
  @Column()
  key: string;

  @ApiProperty({ example: '20' })
  @Column()
  value: string;

  @ApiProperty({ example: 'number' })
  @Column()
  type: string; // 'string', 'boolean', 'number'

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business: Business) => business.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
