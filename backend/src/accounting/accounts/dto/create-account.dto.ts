import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AccountType, AccountSubType } from '../account.entity';

export class CreateAccountDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsEnum(AccountType) type: AccountType;
  @IsEnum(AccountSubType) subType: AccountSubType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() parentId?: string;
}
