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

@Entity('business_configurations')
export class BusinessConfiguration {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'feature_flags' })
  @Column()
  key: string;

  @ApiProperty({ example: '{"enable_pos": true}' })
  @Column()
  value: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business: Business) => business.configurations, {
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
