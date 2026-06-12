import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateApprovalDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  type: string;

  @IsUUID()
  requestedByAgentId: string;

  @IsOptional()
  @IsUUID()
  reviewedByAgentId?: string;

  @IsObject()
  payload: Record<string, any>;
}
