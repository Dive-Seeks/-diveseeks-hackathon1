import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  storeId?: string;
  @IsOptional()
  isCoder?: boolean;

  @IsOptional()
  isBusiness?: boolean;
}
