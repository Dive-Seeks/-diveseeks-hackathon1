import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('menu_templates')
@Index(['businessType', 'cuisineType', 'dietaryCategory'])
export class MenuTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'business_type' })
  businessType: 'RESTAURANT' | 'RETAIL' | 'CAFE' | 'BAR' | 'HYBRID';

  @Column({ name: 'cuisine_type', type: 'varchar', nullable: true })
  cuisineType: string | null; // 'Italian', 'Indian', 'Mexican', etc.

  @Column({ name: 'dietary_category', type: 'varchar', nullable: true })
  dietaryCategory: string | null; // 'Halal', 'Vegetarian', 'Vegan', 'Kosher'

  @Column({ name: 'template_name' })
  templateName: string; // "Halal Pizza Restaurant Starter"

  @Column({ type: 'jsonb', name: 'template_data' })
  templateData: {
    categories: Array<{
      name: string;
      items: Array<{
        name: string;
        base_price: number;
        description: string;
        dietary_status?: string;
        modifiers?: string[];
      }>;
    }>;
    modifiers: Array<{
      id: string;
      name: string;
      options: Array<{
        name: string;
        price_delta?: number;
        dietary_status?: string;
      }>;
    }>;
  };

  @Column({ name: 'usage_count', default: 0 })
  usageCount: number; // Track popularity

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
  })
  confidenceScore: number; // 1.0 = human-curated, <1.0 = AI-generated

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
