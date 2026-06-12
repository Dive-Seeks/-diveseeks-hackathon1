import { IsString, IsOptional } from 'class-validator';

export class TriggerEvolutionDto {
  @IsString()
  specialistId: string;

  @IsOptional()
  @IsString()
  secret?: string;
}
