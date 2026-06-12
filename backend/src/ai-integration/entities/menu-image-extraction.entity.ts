import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('menu_image_extractions')
@Index(['tenantId', 'createdAt'])
export class MenuImageExtraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'image_name', nullable: true })
  imageName: string;

  @Column({ type: 'jsonb', name: 'extracted_data' })
  extractedData: any;

  @Column({ name: 'model', nullable: true })
  model: string;

  @Column({ name: 'key_index', type: 'int', nullable: true })
  keyIndex: number;

  @Column({ name: 'status', default: 'success' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
