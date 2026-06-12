import { ValidateNested, IsArray, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import {
  BusinessBasicsDto,
  DirectorDto,
  BankDetailsDto,
  StoreInfoDto,
} from './steps.dto';

export class CompleteSetupDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ValidateNested()
  @Type(() => BusinessBasicsDto)
  basics: BusinessBasicsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DirectorDto)
  directors: DirectorDto[];

  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails: BankDetailsDto;

  @ValidateNested()
  @IsOptional()
  @Type(() => StoreInfoDto)
  storeInfo?: StoreInfoDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => StoreInfoDto)
  storeInfos?: StoreInfoDto[];

  // Legacy mappings for frontend compatibility during transition
  @IsOptional()
  siteInfo?: StoreInfoDto;

  @IsOptional()
  @IsArray()
  siteInfos?: StoreInfoDto[];
}
