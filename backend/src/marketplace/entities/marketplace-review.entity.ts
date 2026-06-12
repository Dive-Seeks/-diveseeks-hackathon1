import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('marketplace_reviews')
export class MarketplaceReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  listingId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}
