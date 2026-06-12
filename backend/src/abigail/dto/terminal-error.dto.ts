import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class TerminalErrorDto {
  @IsUUID()
  projectId: string;

  @IsUUID()
  teamId: string;

  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  error: string;

  @IsString()
  @IsOptional()
  stack?: string;

  @IsString()
  @IsNotEmpty()
  terminalName: string;

  @IsString()
  @IsNotEmpty()
  timestamp: string;
}
