import { IsUUID, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSiteDto {
  @ApiProperty() @IsUUID() siteId: string;

  @ApiProperty({ enum: ['classic', 'modern'] })
  @IsIn(['classic', 'modern'])
  templateFamily: 'classic' | 'modern';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  merchantHint?: string;
}
