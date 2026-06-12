import { IsString, IsUUID, IsOptional, IsNumber } from 'class-validator';

export class HireAgentDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID()
  reportsToId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  skillPath?: string;

  @IsOptional()
  @IsNumber()
  budgetMonthlyCents?: number;
}
