import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsInt,
  IsDateString,
} from 'class-validator';
import { DepreciationMethod } from '../depreciation-schedule.entity';

export class CreateDepreciationScheduleDto {
  @IsUUID() assetAccountId: string;
  @IsString() @IsNotEmpty() assetName: string;
  @IsNumber() @IsPositive() costPrice: number;
  @IsOptional() @IsNumber() @Min(0) residualValue?: number;
  @IsNumber() @Min(0.01) @Max(1) annualRate: number;
  @IsEnum(DepreciationMethod) method: DepreciationMethod;
  @IsOptional() @IsInt() @Min(1) usefulLifeYears?: number;
  @IsDateString() acquisitionDate: string;
}
