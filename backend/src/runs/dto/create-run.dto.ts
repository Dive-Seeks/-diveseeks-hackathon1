import { IsUUID, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateRunDto {
  @IsUUID('all')
  issueId: string;

  @IsUUID('all')
  agentId: string;

  @IsUUID('all')
  tenantId: string;

  @IsOptional()
  attempt?: number;

  @IsString()
  idempotencyKey: string;
}
