import {
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ThemeDto {
  @ApiProperty() @IsString() primaryColor: string;
  @ApiProperty() @IsString() fontFamily: string;
  @ApiProperty() @IsBoolean() darkMode: boolean;
}

export class SeoDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ogImage?: string;
}

export class UpdateSiteConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeDto)
  theme?: ThemeDto;

  @ApiProperty({ required: false, description: 'Full Puck JSON data' })
  @IsOptional()
  @IsObject()
  puckData?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subdomain?: string;
}
