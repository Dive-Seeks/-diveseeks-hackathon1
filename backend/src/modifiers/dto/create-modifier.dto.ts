import {
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModifierOptionDto {
  @ApiProperty({ example: 'Small' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0, description: 'Price modifier in cents' })
  @IsInt()
  priceModifier: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: 'Perfect for 1-2 people' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 250 })
  @IsOptional()
  @IsInt()
  calories?: number;

  @ApiPropertyOptional({ example: ['dairy', 'nuts'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({
    example: 'halal',
    enum: ['halal', 'non_halal', 'vegetarian', 'vegan'],
  })
  @IsOptional()
  @IsEnum(['halal', 'non_halal', 'vegetarian', 'vegan'])
  dietaryStatus?: 'halal' | 'non_halal' | 'vegetarian' | 'vegan';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  containsAlcohol?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  containsPork?: boolean;

  @ApiPropertyOptional({ example: '🍕' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateModifierDto {
  @ApiProperty({ example: 'Size' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'single_select',
    enum: ['single_select', 'multi_select', 'quantity', 'text_input'],
  })
  @IsEnum(['single_select', 'multi_select', 'quantity', 'text_input'])
  modifierType: 'single_select' | 'multi_select' | 'quantity' | 'text_input';

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  minSelections: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelections?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'Choose your pizza size' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '📏' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: [CreateModifierOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateModifierOptionDto)
  options: CreateModifierOptionDto[];

  @ApiPropertyOptional({
    example: 'manual',
    enum: ['manual', 'ai_generated', 'template'],
  })
  @IsOptional()
  @IsEnum(['manual', 'ai_generated', 'template'])
  source?: 'manual' | 'ai_generated' | 'template';

  @ApiPropertyOptional({ description: 'Template ID if created from template' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: 'Business ID (from auth context)' })
  @IsString()
  businessId: string;
}
