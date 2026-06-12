import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ApiEndpointDef,
  McpToolDefinition,
} from '../interfaces/api-fusion.interfaces';

@Entity('api_fusion_blueprints')
export class ApiFusionBlueprint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  tenantId: string | null;
  // null = global blueprint (shared vault, usable by all tenants)

  @Column({ length: 100 })
  provider: string;
  // normalised lowercase: 'facebook', 'gmail', 'stripe'

  @Column({ length: 20, default: 'runtime' })
  adapterType: 'mcp_native' | 'runtime' | 'native_ts';
  // mcp_native: wired to provider's official MCP server
  // runtime: DB-driven executor (our adapter path)
  // native_ts: promoted to disk .ts files

  @Column({ type: 'text', nullable: true })
  mcpServerUrl: string | null;
  // set when adapterType = 'mcp_native'

  @Column('jsonb', { nullable: true })
  mcpToolSchemas: McpToolDefinition[] | null;
  // auto-generated on activate, re-registered on boot

  @Column({ type: 'text', nullable: true })
  specSource: string | null;

  @Column('jsonb', { nullable: true })
  specRaw: object | null;

  @Column('jsonb', { default: [] })
  endpoints: ApiEndpointDef[];
  // [{method, path, summary, authRequired, requestSchema, responseSchema, testPlan}]

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  authScheme: 'oauth2' | 'api_key' | 'bearer' | 'basic' | null;

  @Column('jsonb', { nullable: true })
  authConfig: object | null;
  // oauth2: { authorize_url, token_url, scopes[] }
  // api_key: { header_name, param_name }

  @Column({ length: 30, default: 'discovering' })
  status:
    | 'discovering'
    | 'analyzing'
    | 'generating'
    | 'testing'
    | 'pending_approval'
    | 'awaiting_credentials'
    | 'active'
    | 'failed';

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ default: false })
  isGlobal: boolean;

  @Column('int', { default: 0 })
  usageCount: number;

  @Column('timestamp', { nullable: true })
  promotedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
