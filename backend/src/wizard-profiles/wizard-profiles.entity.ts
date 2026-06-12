import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('wizard_business_profiles')
export class WizardBusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', type: 'varchar' })
  tenantId: string;

  @Index()
  @Column({ name: 'site_id', type: 'varchar', nullable: true })
  siteId: string | null;

  @Column({ name: 'business_type', type: 'varchar', default: 'RESTAURANT' })
  businessType: string;

  @Column({ type: 'jsonb', default: '[]' })
  cuisines: string[];

  @Column({ type: 'jsonb', default: '[]' })
  keywords: string[];

  @Column({ name: 'dietary_type', type: 'varchar', nullable: true })
  dietaryType: string | null;

  @Column({ name: 'spice_range', type: 'varchar', nullable: true })
  spiceRange: string | null;

  @Column({ name: 'service_model', type: 'jsonb', default: '[]' })
  serviceModel: string[];

  @Column({ type: 'jsonb', default: '[]' })
  allergens: string[];

  @Column({ name: 'completed_journeys', type: 'jsonb', default: '[]' })
  completedJourneys: string[];

  @Column({ name: 'last_journey', type: 'varchar', nullable: true })
  lastJourney: string | null;

  @Column({ name: 'hygiene_rating', type: 'varchar', nullable: true })
  hygieneRating: string | null;

  @Column({ name: 'shared_kitchen', type: 'boolean', nullable: true })
  sharedKitchen: boolean | null;

  @Column({ name: 'allergen_notice', type: 'boolean', nullable: true })
  allergenNotice: boolean | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
