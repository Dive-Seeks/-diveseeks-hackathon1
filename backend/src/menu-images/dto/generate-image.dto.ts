import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceMode } from '../entities/generated-image.entity';

export class GenerateImageDto {
  @ApiProperty({ description: 'Name of the menu item' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ description: 'Cuisine type (e.g. Italian, Indian)' })
  @IsOptional()
  @IsString()
  cuisineType?: string;

  @ApiPropertyOptional({
    description: 'Business type (e.g. restaurant, fast_food)',
  })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({
    description: 'Style preset: premium or fastFood',
    default: 'premium',
  })
  @IsOptional()
  @IsString()
  preset?: string;

  @ApiPropertyOptional({
    description: 'Source mode for generation',
    enum: SourceMode,
  })
  @IsOptional()
  @IsEnum(SourceMode)
  sourceMode?: SourceMode;

  @ApiPropertyOptional({ description: 'Store ID to scope the generation' })
  @IsOptional()
  @IsString()
  storeId?: string;
}
