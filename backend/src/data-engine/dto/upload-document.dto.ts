import { IsOptional, IsString } from 'class-validator';

/**
 * DTO for document upload.
 * Note: The actual file is handled by NestJS FileInterceptor and Multer.
 * This DTO represents additional metadata that can be sent alongside the file.
 */
export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
