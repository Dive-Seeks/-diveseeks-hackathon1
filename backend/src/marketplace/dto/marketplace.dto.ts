import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  IsUUID,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import {
  AssetType,
  ListingVisibility,
  PriceModel,
  ModerationStatus,
} from '../entities/marketplace-listing.entity';

export class CreateListingDto {
  @IsString()
  @MaxLength(120)
  slug: string;

  @IsEnum(AssetType)
  assetType: AssetType;

  @IsUUID()
  @IsOptional()
  assetId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsEnum(ListingVisibility)
  @IsOptional()
  visibility?: ListingVisibility;

  @IsString()
  @IsOptional()
  licenseSpdx?: string;

  @IsEnum(PriceModel)
  @IsOptional()
  priceModel?: PriceModel;

  @IsInt()
  @IsOptional()
  pricePence?: number;
}

export class PublishVersionDto {
  @IsString()
  version: string;

  @IsObject()
  payload: Record<string, any>;

  @IsString()
  @IsOptional()
  changelog?: string;

  @IsArray()
  @IsOptional()
  dependencies?: Array<{
    listingId: string;
    version: string;
    required: boolean;
  }>;
}

export class InstallDto {
  @IsUUID()
  versionId: string;
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  body?: string;
}

export class QueryListingsDto {
  @IsEnum(AssetType)
  @IsOptional()
  assetType?: AssetType;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  offset?: number;
}

export class ModerateListingDto {
  @IsEnum(ModerationStatus)
  moderation: ModerationStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
