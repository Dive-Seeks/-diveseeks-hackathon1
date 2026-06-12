import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID('all')
  reportsToId?: string;

  @IsOptional()
  @IsUUID('all')
  tenantId?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  adapterType?: string;

  @IsOptional()
  adapterConfig?: Record<string, any>;

  @IsOptional()
  @IsString()
  skillPath?: string;

  @IsOptional()
  @IsNumber()
  budgetMonthlyCents?: number;
}
