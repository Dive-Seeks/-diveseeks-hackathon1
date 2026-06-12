import { IsOptional, IsString } from 'class-validator';

export class TriggerMetaOptimizationDto {
  @IsOptional()
  @IsString()
  secret?: string;
}
