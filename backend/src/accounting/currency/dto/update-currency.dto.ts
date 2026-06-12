import { IsOptional, IsNumber, IsPositive, IsBoolean } from 'class-validator';

export class UpdateCurrencyDto {
  @IsOptional() @IsNumber() @IsPositive() exchangeRateToUSD?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
