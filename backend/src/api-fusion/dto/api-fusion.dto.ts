import { IsString, IsOptional, IsUrl, IsUUID, IsObject } from 'class-validator';

export class ConnectApiDto {
  @IsString()
  provider: string;

  @IsOptional()
  @IsUrl()
  specUrl?: string;
}

export class ApproveApiDto {
  @IsUUID()
  blueprintId: string;
}

export class ExecuteApiDto {
  @IsString()
  provider: string;

  @IsString()
  endpoint: string;

  @IsOptional()
  @IsObject()
  payload?: object;
}

export class SubmitCredentialsDto {
  @IsUUID()
  blueprintId: string;

  @IsObject()
  credentials: Record<string, string>;
  // e.g. { apiKey: 'sk_...' } or { accessToken: '...', refreshToken: '...' }
}
