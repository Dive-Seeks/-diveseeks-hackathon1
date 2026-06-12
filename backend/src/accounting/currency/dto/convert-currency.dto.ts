import { IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class ConvertCurrencyDto {
  @IsNumber() @IsPositive() amount: number;
  @IsString() @Length(3, 3) fromCurrency: string;
  @IsString() @Length(3, 3) toCurrency: string;
}
