import {
  IsString,
  IsObject,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SpecialistId } from '../entities/mcp-server-registration.entity';

export class RegisterMcpDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  command: string;

  @ApiProperty()
  @IsObject()
  envVars: Record<string, string>;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  assignedTo: SpecialistId[] | 'chatbox' | 'all';

  @ApiProperty({
    description: 'Unique MCP identifier for registration token verification',
  })
  @IsString()
  mcpId: string;

  @ApiProperty({ description: 'HMAC-SHA256(mcpId + BRAIN_SHARED_SECRET)' })
  @IsString()
  registrationToken: string;

  @ApiProperty({
    description: 'List of capabilities this MCP can handle',
    required: false,
  })
  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @ApiProperty({
    description: 'Vault entry ID for this MCP LLM key',
    required: false,
  })
  @IsString()
  @IsOptional()
  llmKeyId?: string;
}

export class ValidateMcpDto {
  @ApiProperty()
  @IsEnum(['active', 'failed', 'partial'])
  status: 'active' | 'failed' | 'partial';

  @ApiProperty()
  @IsArray()
  toolsAvailable: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  error?: string;
}
