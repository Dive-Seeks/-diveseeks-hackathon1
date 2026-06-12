import { ApiProperty } from '@nestjs/swagger';
import { SiteConfig } from '../../sites/entities/site.entity';

export class SiteConfigResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() type: string;
  @ApiProperty() subdomain: string | null;
  @ApiProperty({ enum: ['draft', 'published', 'generating'] })
  websiteStatus: string;
  @ApiProperty({ nullable: true }) websiteConfig: SiteConfig | null;
  @ApiProperty() updatedAt: Date;
}
