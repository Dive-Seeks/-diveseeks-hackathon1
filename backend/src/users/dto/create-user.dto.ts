import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
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

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
