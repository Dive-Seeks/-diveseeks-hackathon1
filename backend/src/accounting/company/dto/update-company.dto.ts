import { IsOptional, IsString, IsEnum, Length, Matches } from 'class-validator';
import { CompanyType } from '../company.entity';

export class UpdateCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() registrationNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsEnum(CompanyType) companyType?: CompanyType;
  @IsOptional() @IsString() @Length(2, 2) countryCode?: string;
  @IsOptional() @IsString() @Length(3, 3) baseCurrency?: string;
  @IsOptional() @IsString() @Matches(/^\d{2}-\d{2}$/) fiscalYearStart?: string;
  @IsOptional() @IsString() @Matches(/^\d{2}-\d{2}$/) fiscalYearEnd?: string;
  @IsOptional() @IsString() vatScheme?: string;
}
