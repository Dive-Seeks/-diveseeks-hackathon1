import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSpecialistDocumentDto {
  @IsString() @IsNotEmpty() @MaxLength(100) specialistId: string;
  @IsString() @IsNotEmpty() @MaxLength(255) title: string;
  @IsString() @IsNotEmpty() @MaxLength(50000) content: string;
  @IsOptional() @IsString() @MaxLength(100) documentType?: string;
}
