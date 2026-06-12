import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Business as BusinessType } from '../../setup-business/entities/business.entity';
import { Business } from '../../setup-business/entities/business.entity';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SiteType {
  POS = 'POS',
  ECOMMERCE = 'ECOMMERCE',
  RESTAURANT = 'RESTAURANT',
  MARKETPLACE = 'MARKETPLACE',
}

export type TemplateFamily = 'classic' | 'modern';

export type BlockType =
  | 'hero'
  | 'menu'
  | 'about'
  | 'contact'
  | 'ordering_cta'
  | 'opening_hours';

export type PuckData = {
  content: Array<{
    type: string;
    props: Record<string, unknown> & { id: string };
  }>;
  root: { props: Record<string, unknown> };
  zones?: Record<
    string,
    Array<{ type: string; props: Record<string, unknown> & { id: string } }>
  >;
};

export type SiteConfig = {
  templateFamily: TemplateFamily;
  templateId: string;
  theme: {
    primaryColor: string;
    fontFamily: string;
    darkMode: boolean;
  };
  puckData: PuckData;
  seo: {
    title: string;
    description: string;
    ogImage?: string;
  };
  generatedAt: string;
};

@Entity('sites')
export class Site {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'POS (In-store)' })
  @Column()
  name: string;

  @ApiProperty({ enum: SiteType, example: SiteType.POS })
  @Column({
    type: 'enum',
    enum: SiteType,
    default: SiteType.POS,
  })
  type: SiteType;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column({ name: 'business_id' })
  businessId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  @Column({ type: 'uuid', name: 'store_id', nullable: true })
  storeId: string | null;

  @ApiProperty({ example: 'GBP' })
  @Column({ default: 'GBP' })
  currency: string;

  @ApiProperty({ example: 'mainstore', nullable: true })
  @Column({ type: 'varchar', nullable: true, unique: true })
  subdomain: string | null;

  @ApiProperty({ enum: ['draft', 'published', 'generating'] })
  @Column({ name: 'website_status', default: 'draft' })
  websiteStatus: 'draft' | 'published' | 'generating';

  @ApiProperty({ nullable: true })
  @Column({ name: 'website_config', type: 'jsonb', nullable: true })
  websiteConfig: SiteConfig | null;

  @Exclude()
  @ManyToOne(() => Business, (business: BusinessType) => business.sites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
