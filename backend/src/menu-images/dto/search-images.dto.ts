import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SearchImagesDto {
  @ApiPropertyOptional({
    description: 'Search query for semantic image search',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Maximum results to return', default: 6 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
