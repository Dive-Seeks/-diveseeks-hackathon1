import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
