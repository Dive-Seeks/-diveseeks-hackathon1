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

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
