import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class SetModelConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
