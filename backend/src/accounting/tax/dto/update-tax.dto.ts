import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class UpdateTaxDto {
  @IsOptional() @IsNumber() @Min(0) @Max(1) rate?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}
