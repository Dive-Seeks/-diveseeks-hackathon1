import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertSpecialistConfigDto {
  @IsOptional()
  @IsBoolean()
  blocked?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  routingBoost?: number;

  @IsOptional()
  @IsString()
  promptAppend?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  dailyTokenCap?: number;
}
