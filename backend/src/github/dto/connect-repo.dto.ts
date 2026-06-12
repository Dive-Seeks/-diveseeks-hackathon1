import { IsString, IsUUID } from 'class-validator';

export class ConnectRepoDto {
  @IsUUID()
  projectId: string;

  @IsString()
  repoFullName: string; // "owner/repo"
}
