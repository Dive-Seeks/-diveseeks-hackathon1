import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CalculateTaxDto {
  @IsString() @IsNotEmpty() buyerCountry: string;
  @IsNumber() @IsPositive() amount: number;
  @IsOptional() @IsString() buyerVatNumber?: string;
  @IsOptional() @IsString() taxCode?: string;
}
