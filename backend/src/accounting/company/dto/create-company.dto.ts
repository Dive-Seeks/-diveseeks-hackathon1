import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { CompanyType } from '../company.entity';

export class CreateCompanyDto {
  @IsString() name: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional() @IsEnum(CompanyType) companyType?: CompanyType;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() baseCurrency?: string;
  @IsOptional() @IsString() fiscalYearStart?: string;
  @IsOptional() @IsString() fiscalYearEnd?: string;
  @IsOptional() @IsString() vatScheme?: string;
}
