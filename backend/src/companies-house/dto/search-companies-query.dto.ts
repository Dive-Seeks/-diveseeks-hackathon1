import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchCompaniesQueryDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  itemsPerPage?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startIndex?: number = 0;
}
