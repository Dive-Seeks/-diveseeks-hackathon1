import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_chat_messages')
@Index(['tenantId', 'projectId', 'createdAt'])
@Index(['tenantId', 'userId'])
export class UserChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  tenantId: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ['coding', 'general', 'research'] })
  team: 'coding' | 'general' | 'research';

  @Column({ type: 'enum', enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Column('text')
  content: string;

  @Column({ nullable: true })
  specialistId?: string;

  @Column('uuid', { nullable: true })
  sessionId?: string;

  @Column('int', { default: 0 })
  tokenCount: number;

  @Column('timestamp', { nullable: true })
  dreamedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
