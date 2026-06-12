import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { JournalStatus, JournalType } from '../journal-entry.entity';

export class ListJournalDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsEnum(JournalStatus) status?: JournalStatus;
  @IsOptional() @IsEnum(JournalType) type?: JournalType;
  @IsOptional() @IsUUID() accountId?: string;
  @IsOptional() @IsUUID() siteId?: string;
  @IsOptional() @IsInt() @Min(1) page?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number;
}
