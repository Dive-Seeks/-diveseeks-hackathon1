import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}
