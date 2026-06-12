import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { TaxType } from '../tax-rate.entity';

export class CreateTaxDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsEnum(TaxType) taxType: TaxType;
  @IsString() countryCode: string;
  @IsNumber() rate: number;
  @IsOptional() @IsString() taxAccountCode?: string;
  @IsOptional() @IsString() description?: string;
}
