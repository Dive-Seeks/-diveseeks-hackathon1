import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateSpecialistDocumentDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50000) content?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) documentType?: string;
}
