import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsUUID,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BrsItemType, BrsAdjustmentSide } from '../bank-reconciliation.entity';

export class CreateBrsItemDto {
  @IsEnum(BrsItemType) itemType: BrsItemType;
  @IsString() @IsNotEmpty() description: string;
  @IsNumber() @IsPositive() amount: number;
  @IsEnum(BrsAdjustmentSide) adjustmentSide: BrsAdjustmentSide;
  @IsOptional() @IsUUID() journalEntryId?: string;
}

export class CreateBrsDto {
  @IsUUID() bankAccountId: string;
  @IsDateString() statementDate: string;
  @IsNumber() statementBalance: number;
  @ValidateNested({ each: true })
  @Type(() => CreateBrsItemDto)
  items: CreateBrsItemDto[];
}
