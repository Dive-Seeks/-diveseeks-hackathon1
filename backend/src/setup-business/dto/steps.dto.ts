import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';

export enum BusinessType {
  SOLE_TRADER = 'Sole Trader',
  LIMITED_COMPANY = 'Limited Company',
  PARTNERSHIP = 'Partnership',
  LLP = 'LLP',
  SOLE_PROPRIETORSHIP = 'Sole Proprietorship',
  LLC = 'LLC',
  CORPORATION = 'Corporation',
  CO_OPERATIVE = 'Co-operative',
  BRANCH_OFFICE = 'Branch Office',
  COMPANY = 'Company',
  TRUST = 'Trust',
  SOLE_ESTABLISHMENT = 'Sole Establishment',
  PRIVATE_JOINT_STOCK = 'Private Joint Stock',
  FOREIGN_BRANCH = 'Foreign Branch',
  AOP = 'AOP',
  PVT = 'PVT',
  SMC = 'SMC',
  PRIVATE_LIMITED = 'Private Limited',
  OTHER = 'Other',
}

export class BusinessBasicsDto {
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ValidateNested()
  @Type(() => AddressDto)
  registeredAddress: AddressDto;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsEmail()
  companyEmail: string;

  @IsString()
  @IsNotEmpty()
  companyPhone: string;
}

export class DirectorDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  dob: string; // Format: DD/MM/YYYY

  @ValidateNested()
  @Type(() => AddressDto)
  residentialAddress: AddressDto;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  encryptedPayload: string;

  @IsNotEmpty()
  maskedPreview: any;
}

export class OperatingHourDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  day: string;

  @IsString()
  @IsNotEmpty()
  open_time: string;

  @IsString()
  @IsNotEmpty()
  close_time: string;
}

export class HolidayDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsBoolean()
  is_closed: boolean;

  @IsOptional()
  @IsString()
  open_time?: string;

  @IsOptional()
  @IsString()
  close_time?: string;
}

export class StoreInfoDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  placeId?: string;

  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ValidateNested()
  @Type(() => AddressDto)
  storeAddress: AddressDto;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsBoolean()
  is24_7: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourDto)
  dailyTimeSlots?: OperatingHourDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HolidayDto)
  holidays?: HolidayDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedChannels?: string[];
}

export class StoreInfoBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreInfoDto)
  stores: StoreInfoDto[];
}
