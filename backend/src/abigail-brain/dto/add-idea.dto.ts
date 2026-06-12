import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class AddIdeaDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @IsOptional()
  batchNumber?: number;
}
