import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';

export class CreateIssueDto {
  @IsUUID('all')
  tenantId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID('all')
  assigneeAgentId: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsObject()
  goalAncestry?: Record<string, any>;

  @IsOptional()
  @IsObject()
  constraints?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  parentIssueId?: string;

  @IsOptional()
  @IsEnum(['routine', 'manual', 'chat', 'hire'])
  originKind?: string;
}
