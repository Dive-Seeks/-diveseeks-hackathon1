import { IsString, IsUUID, MaxLength, IsOptional } from 'class-validator';

export class CreateRepoDto {
  @IsUUID()
  project_id: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
