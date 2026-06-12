import { ApiProperty } from '@nestjs/swagger';
import { SiteType } from '../entities/site.entity';

export class SiteResponseDto {
  @ApiProperty({ description: 'Unique identifier', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Site name', example: 'Online Store' })
  name: string;

  @ApiProperty({ enum: SiteType, description: 'Sales channel type' })
  type: SiteType;

  @ApiProperty({ description: 'Whether site is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Parent business ID' })
  businessId: string;

  @ApiProperty({ description: 'Number of categories in menu' })
  categoryCount?: number;

  @ApiProperty({ description: 'Number of items in menu' })
  itemCount?: number;

  @ApiProperty({ description: 'Number of modifiers in menu' })
  modifierCount?: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class SiteListResponseDto {
  @ApiProperty({ type: [SiteResponseDto] })
  data: SiteResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}
