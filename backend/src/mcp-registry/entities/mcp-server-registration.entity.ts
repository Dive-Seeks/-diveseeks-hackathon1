import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type SpecialistId =
  | 'rex'
  | 'nova'
  | 'kai'
  | 'sage'
  | 'atlas'
  | 'orion'
  | 'pixel'
  | 'luma'
  | 'felix'
  | 'vex';

export type McpStatus = 'active' | 'failed' | 'disabled' | 'stale' | 'revoked';

@Entity('mcp_server_registrations')
export class McpServerRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  @Index({ unique: true })
  mcpId: string;

  @Column()
  name: string;

  @Column()
  command: string;

  @Column({ type: 'jsonb' })
  envVars: Record<string, string>;

  @Column({ type: 'jsonb' })
  assignedTo: SpecialistId[] | 'chatbox' | 'all';

  @Column({ type: 'jsonb', default: [] })
  capabilities: string[];

  @Column({ default: 'active' })
  status: McpStatus;

  @Column({ type: 'jsonb', default: [] })
  toolsAvailable: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  validationError: string | null;

  // Heartbeat tracking
  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeatAt: Date | null;

  @Column({ default: 0 })
  missedHeartbeats: number;

  // Zero-trust security
  @Column({ type: 'char', length: 64, nullable: true })
  registrationTokenHash: string | null;

  // Revocation
  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  revokeReason: string | null;

  // Per-MCP LLM key reference (stored in credential vault)
  @Column({ type: 'varchar', nullable: true })
  llmKeyId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
