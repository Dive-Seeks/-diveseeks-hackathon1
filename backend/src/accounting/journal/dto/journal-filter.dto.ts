import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class JournalFilterDto {
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() siteId?: string;
}
