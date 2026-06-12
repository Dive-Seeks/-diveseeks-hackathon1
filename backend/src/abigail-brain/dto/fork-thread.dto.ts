import { IsString, IsNotEmpty } from 'class-validator';

export class ForkThreadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  topic: string;
}
