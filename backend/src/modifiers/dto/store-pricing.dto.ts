import {
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StorePriceDto {
  @ApiProperty({ description: 'Store ID' })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Price modifier in cents for this store' })
  @IsInt()
  priceModifier: number;
}

export class UpdateOptionStorePricingDto {
  @ApiProperty({ description: 'Modifier option ID' })
  @IsString()
  modifierOptionId: string;

  @ApiProperty({ type: [StorePriceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StorePriceDto)
  storePrices: StorePriceDto[];
}

export class BulkUpdateStorePricingDto {
  @ApiProperty({ type: [UpdateOptionStorePricingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateOptionStorePricingDto)
  options: UpdateOptionStorePricingDto[];
}
