import { IsString, IsUUID } from 'class-validator';

export class PushGitContextDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  teamId: string;

  @IsString()
  log: string;

  @IsString()
  status: string;

  @IsString()
  tree: string;
}
