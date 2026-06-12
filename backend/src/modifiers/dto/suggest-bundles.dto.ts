import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestBundlesDto {
  @ApiProperty({
    description: 'Name of the menu item',
    example: 'Margherita Pizza',
  })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({
    description: 'Category slug of the item',
    example: 'pizza',
  })
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiProperty({
    description: 'Type of business',
    enum: ['RESTAURANT', 'RETAIL', 'CAFE', 'BAR', 'HYBRID'],
    example: 'RESTAURANT',
  })
  @IsEnum(['RESTAURANT', 'RETAIL', 'CAFE', 'BAR', 'HYBRID'])
  businessType: 'RESTAURANT' | 'RETAIL' | 'CAFE' | 'BAR' | 'HYBRID';

  @ApiPropertyOptional({
    description: 'Optional description of the item for better AI suggestions',
    example: 'Classic Italian pizza with tomato sauce, mozzarella, and basil',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
