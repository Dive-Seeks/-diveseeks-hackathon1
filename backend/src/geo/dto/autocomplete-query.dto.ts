import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AutocompleteQueryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  query: string;
}
