import { ApiProperty } from '@nestjs/swagger';

export class StoreAddressDto {
  @ApiProperty() street: string;
  @ApiProperty() locality: string;
  @ApiProperty() region: string;
  @ApiProperty() postalCode: string;
  @ApiProperty() country: string;
}

export class StoreResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Store name' })
  name: string;

  @ApiProperty({ description: 'Currency code', example: 'GBP' })
  currency: string;

  @ApiProperty({ description: 'Open 24/7 flag' })
  is_24_7: boolean;

  @ApiProperty({ description: 'Parent business ID' })
  businessId: string;

  @ApiProperty({
    type: StoreAddressDto,
    description: 'Physical address',
    nullable: true,
  })
  storeAddress: StoreAddressDto | null;

  @ApiProperty({ description: 'Google Places ID', nullable: true })
  placeId: string | null;
}

export class StoreListResponseDto {
  @ApiProperty({ type: [StoreResponseDto] })
  data: StoreResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}
