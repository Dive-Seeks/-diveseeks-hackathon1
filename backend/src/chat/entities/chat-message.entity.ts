import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_messages')
@Index(['tenantId', 'domain'])
@Index(['projectId', 'threadId', 'createdAt'])
@Index(['createdAt'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id', type: 'uuid' }) tenantId: string;
  @Column() domain: string;
  @Column({ name: 'sender_role' }) senderRole: string; // 'tenant' | 'manager' | 'specialist' | 'abigail'
  @Column({ name: 'sender_type', nullable: true }) senderType: string; // 'user' | 'agent'
  @Column({ name: 'agent_name', nullable: true }) agentName: string;
  @Column({ name: 'sender_id', nullable: true }) senderId: string;
  @Column({ type: 'text' }) content: string;
  @Column({ name: 'interaction_type', nullable: true }) interactionType: string;
  @Column({ name: 'approval_id', nullable: true }) approvalId: string;
  @Column({ name: 'is_correction', default: false }) isCorrection: boolean;
  @Column({ name: 'project_id', type: 'uuid', nullable: true }) projectId:
    | string
    | null;
  @Column({ name: 'thread_id', type: 'varchar', nullable: true }) threadId:
    | string
    | null;
  @Column({ name: 'to_agent', type: 'varchar', nullable: true }) toAgent:
    | string
    | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
