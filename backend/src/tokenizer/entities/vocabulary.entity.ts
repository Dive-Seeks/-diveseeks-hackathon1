import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vocabulary')
export class VocabularyToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string;

  @Column('int')
  tokenId: number; // tiktoken token ID

  @Column('int', { default: 0 })
  frequency: number; // how often seen across all scraped content

  @Column({ nullable: true, type: 'varchar' })
  domain: string | null; // 'robotics' | 'healthcare' | 'legal' | null (general)

  @CreateDateColumn()
  firstSeenAt: Date;

  @UpdateDateColumn()
  lastSeenAt: Date;
}
