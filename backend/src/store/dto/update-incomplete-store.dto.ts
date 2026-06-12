import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BusinessStatus } from '../../setup-business/entities/business.entity';

export class UpdateIncompleteStoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  registrationNumber?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  companyPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @IsIn([BusinessStatus.UNSAVED, BusinessStatus.SAVED])
  status?: BusinessStatus.UNSAVED | BusinessStatus.SAVED;
}
