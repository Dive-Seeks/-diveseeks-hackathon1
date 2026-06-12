import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EntryType } from '../journal-line.entity';
import { JournalType } from '../journal-entry.entity';

export class JournalLineDto {
  @IsEnum(EntryType) entryType: EntryType;
  @IsString() accountId: string;
  @IsNumber() amount: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsNumber() taxRate?: number;
  @IsOptional() @IsNumber() taxAmount?: number;
}

export class CreateJournalDto {
  @IsOptional() @IsString() siteId?: string;
  @IsString() memo: string;
  @IsOptional() @IsDateString() entryDate?: string;
  @IsOptional() @IsEnum(JournalType) type?: JournalType;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() exchangeRate?: number;
  @IsOptional() @IsString() referenceType?: string;
  @IsOptional() @IsString() referenceId?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}
