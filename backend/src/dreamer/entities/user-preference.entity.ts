import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_preferences')
@Index(['tenantId', 'userId'])
export class UserPreference {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') @Index() tenantId: string;
  @Column('uuid') userId: string;
  @Column({ type: 'enum', enum: ['style', 'fact', 'frustration', 'topic'] })
  category: 'style' | 'fact' | 'frustration' | 'topic';
  @Column() key: string;
  @Column('text') value: string;
  @Column('float', { default: 1.0 }) confidence: number;
  @Column('int', { default: 1 }) reinforcementCount: number;
  @Column({ type: 'vector', length: 768, nullable: true }) embedding:
    | string
    | null; // stored as "[0.1,0.2,...]"
  @Column('timestamp') lastReinforcedAt: Date;
  @Column('timestamp', { nullable: true }) archivedAt?: Date;
  @CreateDateColumn() createdAt: Date;
}
