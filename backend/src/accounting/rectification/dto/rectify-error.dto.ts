import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsPositive,
} from 'class-validator';

export enum ErrorType {
  OMISSION = 'OMISSION',
  COMMISSION = 'COMMISSION',
  PRINCIPLE = 'PRINCIPLE',
  COMPENSATING = 'COMPENSATING',
  COMPLETE_REVERSAL = 'COMPLETE_REVERSAL',
  PARTIAL_OMISSION = 'PARTIAL_OMISSION',
}

export class RectifyErrorDto {
  @IsEnum(ErrorType) errorType: ErrorType;
  @IsOptional() @IsUUID() originalJournalEntryId?: string;
  @IsString() @IsNotEmpty() memo: string;

  // Add other required fields depending on the error type
  @IsOptional() @IsUUID() correctAccountId?: string;
  @IsOptional() @IsUUID() wrongAccountId?: string;
  @IsOptional() @IsNumber() @IsPositive() amount?: number;
}
