import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('agent_evolution_events')
export class AgentEvolutionEvent {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() tenant_id: string;
  @Column() agent: string; // 'abigail' | specialist name
  @Column() domain: string; // 'menu' | 'seo' | etc.
  @Column() intent: string; // 'repair' | 'preference' | 'pattern'

  @Column('text', { array: true }) signals: string[];
  @Column('text', { array: true }) genes_used: string[]; // gene IDs applied

  @Column('jsonb') blast_radius: { domain: string; fields: string[] };
  @Column('jsonb') outcome: {
    status: string;
    score: number;
    approval?: boolean;
  };

  @Column('text', { nullable: true }) parent_event_id: string;
  @Column('text', { nullable: true }) validation_report: string;

  @Column('jsonb') meta: { note: string; session_id: string };

  @CreateDateColumn() created_at: Date;
}
