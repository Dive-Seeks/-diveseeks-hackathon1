import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SkillLevel = 'junior' | 'comfortable' | 'experienced' | 'expert';

@Entity('developer_profiles')
export class DeveloperProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: 'junior' })
  skillLevel: SkillLevel;

  @Column('float', { default: 0.25 })
  taskSizeMultiplier: number;

  @Column('int', { default: 0 })
  taskCount: number;

  @Column({ default: true })
  needsInlineComments: boolean;

  @Column({ default: true })
  needsPrExplanation: boolean;

  @Column({ default: true })
  offerImprovement: boolean;

  @Column('int', { default: 1 })
  learningMaterialDepth: 0 | 1 | 2;

  @Column({ default: false })
  interviewCompleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
