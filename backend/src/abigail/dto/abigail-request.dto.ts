import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class AbigailRequestDto {
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  specialist?: string;

  @IsOptional()
  @IsString()
  alsoSpecialist?: string;

  @IsOptional()
  @IsIn(['coding', 'general', 'research'])
  team?: string;

  @IsOptional()
  @IsIn(['canvas-run', 'chat'])
  source?: 'canvas-run' | 'chat';
}
