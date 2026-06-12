import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignImageDto {
  @ApiProperty({ enum: ['product', 'category', 'menu_item'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['product', 'category', 'menu_item'])
  entityType: 'product' | 'category' | 'menu_item';

  @ApiProperty({ description: 'ID of the product, category, or menu item' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    required: false,
    description: 'Previous image ID to decrement usage on',
  })
  @IsString()
  @IsOptional()
  previousImageId?: string;
}
