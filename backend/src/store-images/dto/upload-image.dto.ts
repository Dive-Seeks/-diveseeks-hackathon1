import { IsString, IsOptional, IsArray, Allow } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({ required: false, description: 'Tags for the image' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Allow the file property to exist in the body without validation error
  // The actual file is handled by Multer's FileInterceptor
  @Allow()
  file?: any;
}
