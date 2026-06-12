import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CategoryTemplatesDto {
  @ApiProperty({
    example: 'RESTAURANT',
    description: 'Business type for template matching',
    required: false,
  })
  @IsString()
  @IsOptional()
  businessType?: string;

  @ApiProperty({
    example: ['fast casual', 'quick service'],
    description: 'Keywords to filter templates',
    required: false,
  })
  @IsArray()
  @IsOptional()
  keywords?: string[];

  @ApiProperty({
    example: ['Italian', 'Mexican'],
    description: 'Cuisine types to filter templates',
    required: false,
  })
  @IsArray()
  @IsOptional()
  cuisines?: string[];
}
